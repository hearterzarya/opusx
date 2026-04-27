import { ApiKey, KeyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export function resolveClientApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.replace("Bearer ", "").trim();
  const xApiKey = request.headers.get("x-api-key");
  return xApiKey?.trim() ?? null;
}

export async function validateProxyKey(clientKey: string): Promise<{ apiKey?: ApiKey; error?: Response }> {
  const apiKey = await prisma.apiKey.findUnique({ where: { key: clientKey } });
  if (!apiKey) {
    return { error: Response.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  if (apiKey.status !== KeyStatus.ACTIVE) {
    return { error: Response.json({ error: "Key revoked" }, { status: 403 }) };
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return { error: Response.json({ error: "Key expired" }, { status: 403 }) };
  }

  if (apiKey.tokensUsed >= apiKey.tokenBudget) {
    return {
      error: Response.json(
        {
          type: "error",
          error: {
            type: "budget_exceeded",
            message: "Token budget exhausted. Contact your admin.",
          },
        },
        { status: 200 },
      ),
    };
  }

  const usage = await prisma.usageLog.aggregate({
    where: {
      apiKeyId: apiKey.id,
      createdAt: { gt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    },
    _sum: {
      totalTokens: true,
    },
  });
  const rollingTokens = usage._sum.totalTokens ?? 0;

  if (BigInt(rollingTokens) >= apiKey.rollingWindowLimit) {
    return {
      error: new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "budget_exceeded",
            message: "Rolling token window exceeded. Try again shortly.",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    };
  }

  const allowed = checkRateLimit(apiKey.id, apiKey.requestsPerMinute);
  if (!allowed) {
    return {
      error: new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }),
    };
  }

  return { apiKey };
}
