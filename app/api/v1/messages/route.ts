import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extractTokenUsage } from "@/lib/extract-token-usage";
import { finalizeRollingWindowTokens } from "@/lib/api-key-quota";
import { resolveClientApiKey, validateProxyKey } from "@/lib/proxy";
import { estimateQuotaReservationFromMessageBody } from "@/lib/tokens";
import { getAnthropicApiKey, getAnthropicBaseUrl } from "@/lib/system-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive().optional(),
  messages: z.array(z.record(z.string(), z.unknown())),
  stream: z.boolean().optional(),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  const clientKey = resolveClientApiKey(request);
  if (!clientKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const rawBody = await request.text();
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const reserve = estimateQuotaReservationFromMessageBody(body as unknown as Record<string, unknown>);
  const result = await validateProxyKey(clientKey, { quotaReserveTokens: reserve });
  if ("error" in result) {
    return result.error ?? NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { apiKey, quotaReservation } = result;

  let quotaFinalized = false;
  const finalizeQuota = async (actualTokens: number) => {
    if (quotaFinalized || !quotaReservation) return;
    quotaFinalized = true;
    await finalizeRollingWindowTokens(prisma, apiKey.id, quotaReservation, actualTokens);
  };

  try {
    const stream = body.stream === true;
    const anthropicApiKey = await getAnthropicApiKey();
    const anthropicBaseUrl = await getAnthropicBaseUrl();
    if (!anthropicApiKey) {
      await finalizeQuota(0);
      return NextResponse.json({ error: "Anthropic API key is not configured" }, { status: 500 });
    }

    const passthroughHeaders = new Headers();
    const allowedHeaders = ["anthropic-version", "anthropic-beta", "content-type"];
    for (const headerName of allowedHeaders) {
      const value = request.headers.get(headerName);
      if (value) passthroughHeaders.set(headerName, value);
    }
    passthroughHeaders.set("x-api-key", anthropicApiKey);
    if (!passthroughHeaders.has("anthropic-version")) {
      passthroughHeaders.set("anthropic-version", "2023-06-01");
    }
    if (!passthroughHeaders.has("content-type")) {
      passthroughHeaders.set("content-type", "application/json");
    }

    const upstreamResponse = await fetch(`${anthropicBaseUrl}/v1/messages`, {
      method: "POST",
      headers: passthroughHeaders,
      body: rawBody,
      signal: request.signal,
    });

    if (stream) {
      if (!upstreamResponse.body) {
        await finalizeQuota(0);
        return NextResponse.json({ error: "Stream not available from upstream" }, { status: 502 });
      }

      let tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      let buffered = "";
      const reader = upstreamResponse.body.getReader();
      const transform = new TransformStream<Uint8Array, Uint8Array>();
      const writer = transform.writable.getWriter();
      const decoder = new TextDecoder();

      const parseSsePayload = (payload: string) => {
        const lines = payload.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsedSse = JSON.parse(data) as Record<string, unknown>;
            const extracted = extractTokenUsage(parsedSse);
            if (extracted.totalTokens > 0 || extracted.inputTokens > 0 || extracted.outputTokens > 0) {
              tokenUsage = extracted;
            }
          } catch {
            // Ignore malformed partial chunk payloads.
          }
        }
      };

      void (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            await writer.write(value);

            buffered += decoder.decode(value, { stream: true });
            const blocks = buffered.split("\n\n");
            buffered = blocks.pop() ?? "";
            for (const block of blocks) {
              parseSsePayload(block);
            }
          }

          if (buffered) {
            parseSsePayload(buffered);
          }
        } finally {
          await writer.close();
          const { inputTokens, outputTokens, totalTokens } = tokenUsage;
          try {
            if (upstreamResponse.status < 500) {
              await prisma.$transaction([
                prisma.usageLog.create({
                  data: {
                    apiKeyId: apiKey.id,
                    userId: apiKey.userId,
                    model: body.model,
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    endpoint: "/api/v1/messages",
                    statusCode: upstreamResponse.status,
                    durationMs: Date.now() - startedAt,
                  },
                }),
                prisma.apiKey.update({
                  where: { id: apiKey.id },
                  data: {
                    tokensUsed: {
                      increment: BigInt(totalTokens),
                    },
                  },
                }),
              ]);
            }
          } finally {
            await finalizeQuota(totalTokens);
          }
        }
      })();

      return new Response(transform.readable, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    let actualTokensForQuota = 0;
    try {
      const rawUpstreamBody = await upstreamResponse.text();
      let responseData: unknown = {};
      try {
        responseData = JSON.parse(rawUpstreamBody) as Record<string, unknown>;
      } catch {
        responseData = { raw: rawUpstreamBody };
      }

      const tokenUsage = extractTokenUsage(responseData);
      const inputTokens = Number.isFinite(tokenUsage.inputTokens) ? tokenUsage.inputTokens : 0;
      const outputTokens = Number.isFinite(tokenUsage.outputTokens) ? tokenUsage.outputTokens : 0;
      const totalTokens = Number.isFinite(tokenUsage.totalTokens) ? tokenUsage.totalTokens : 0;

      await prisma.$transaction([
        prisma.usageLog.create({
          data: {
            apiKeyId: apiKey.id,
            userId: apiKey.userId,
            model: body.model,
            inputTokens,
            outputTokens,
            totalTokens,
            endpoint: "/api/v1/messages",
            statusCode: upstreamResponse.status,
            durationMs: Date.now() - startedAt,
          },
        }),
        prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            tokensUsed: {
              increment: BigInt(totalTokens),
            },
          },
        }),
      ]);

      actualTokensForQuota = totalTokens;
      return NextResponse.json(responseData, { status: upstreamResponse.status });
    } finally {
      await finalizeQuota(actualTokensForQuota);
    }
  } catch {
    await finalizeQuota(0);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 });
  }
}
