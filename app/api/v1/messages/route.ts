import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { estimateInputTokens, parseUsageTokens } from "@/lib/tokens";
import { resolveClientApiKey, validateProxyKey } from "@/lib/proxy";
import { getAnthropicApiKey, getAnthropicBaseUrl } from "@/lib/system-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive().optional(),
  messages: z.array(z.record(z.string(), z.unknown())),
  stream: z.boolean().optional(),
});

function extractUsageTokens(payload: unknown): { inputTokens?: number; outputTokens?: number } {
  if (!payload || typeof payload !== "object") return {};

  const stack: unknown[] = [payload];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    const usage = record.usage;
    if (usage && typeof usage === "object") {
      const usageRecord = usage as Record<string, unknown>;
      const i = usageRecord.input_tokens;
      const o = usageRecord.output_tokens;
      if (typeof i === "number") inputTokens = i;
      if (typeof o === "number") outputTokens = o;
    }

    for (const value of Object.values(record)) {
      stack.push(value);
    }
  }

  return { inputTokens, outputTokens };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const clientKey = resolveClientApiKey(request);
    if (!clientKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const { apiKey, error } = await validateProxyKey(clientKey);
    if (error || !apiKey) {
      return error ?? NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const rawBody = await request.text();
    const body = messageSchema.parse(JSON.parse(rawBody) as Record<string, unknown>);
    const stream = body.stream === true;
    const inputTokensEstimate = estimateInputTokens(body as unknown as Record<string, unknown>);
    const anthropicApiKey = await getAnthropicApiKey();
    const anthropicBaseUrl = getAnthropicBaseUrl();
    if (!anthropicApiKey) {
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
        return NextResponse.json({ error: "Stream not available from upstream" }, { status: 502 });
      }

      let inputTokens = inputTokensEstimate;
      let outputTokens = 0;
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
            const parsed = JSON.parse(data) as Record<string, unknown>;
            const extracted = extractUsageTokens(parsed);
            if (extracted.inputTokens !== undefined) inputTokens = extracted.inputTokens;
            if (extracted.outputTokens !== undefined) outputTokens = extracted.outputTokens;

            if (extracted.outputTokens === undefined) {
              const delta = parsed.delta;
              if (delta && typeof delta === "object") {
                const text = (delta as Record<string, unknown>).text;
                if (typeof text === "string") {
                  outputTokens += Math.max(1, Math.ceil(text.length / 4));
                }
              }
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
          const totalTokens = inputTokens + outputTokens;
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

    const data = (await upstreamResponse.json()) as Record<string, unknown>;
    const { inputTokens, outputTokens, totalTokens } = parseUsageTokens(data, inputTokensEstimate);

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

    return NextResponse.json(data, { status: upstreamResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 });
  }
}
