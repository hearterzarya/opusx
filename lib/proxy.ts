import { ApiKey, KeyStatus, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isApiKeyExpired } from "@/lib/key-expiry";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  finalizeRollingWindowTokens,
  reserveRollingWindowTokens,
  type RollingQuotaBlocked,
  type RollingQuotaReservation,
} from "@/lib/api-key-quota";

export type { RollingQuotaReservation };

export function resolveClientApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.replace("Bearer ", "").trim();
  const xApiKey = request.headers.get("x-api-key");
  return xApiKey?.trim() ?? null;
}

export function rollingQuotaExceededResponse(blocked: RollingQuotaBlocked): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil(blocked.retryAfterMs / 1000));
  const resetAt = new Date(blocked.resetAtMs).toISOString();
  return new Response(
    JSON.stringify({
      type: "error",
      error: {
        type: "rolling_quota_exceeded",
        message: "Rolling token window quota is exhausted. Try again after reset.",
        reset_at: resetAt,
        retry_after_ms: blocked.retryAfterMs,
        limit: blocked.limit.toString(),
        consumed: blocked.consumed.toString(),
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export type ValidateProxyKeyResult =
  | { apiKey: ApiKey; quotaReservation: RollingQuotaReservation | null }
  | { error: Response };

export async function validateProxyKey(
  clientKey: string,
  options?: { quotaReserveTokens?: number },
): Promise<ValidateProxyKeyResult> {
  const apiKey = await prisma.apiKey.findUnique({ where: { key: clientKey } });
  if (!apiKey) {
    return { error: Response.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  if (apiKey.status !== KeyStatus.ACTIVE) {
    return { error: Response.json({ error: "Key revoked" }, { status: 403 }) };
  }

  if (isApiKeyExpired(apiKey.expiresAt)) {
    const expiredAt = apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString() : "";
    return {
      error: Response.json(
        {
          type: "error",
          error: {
            type: "key_expired",
            message: `This API key expired on ${expiredAt.slice(0, 10)}. Contact your administrator to renew it.`,
            expired_at: expiredAt,
          },
        },
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    };
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

  const reserve =
    options?.quotaReserveTokens !== undefined && options.quotaReserveTokens !== null
      ? options.quotaReserveTokens
      : undefined;

  if (reserve !== undefined) {
    const { blocked, reservation } = await reserveRollingWindowTokens(prisma, apiKey.id, reserve);
    if (blocked) {
      return { error: rollingQuotaExceededResponse(blocked) };
    }
    const allowed = checkRateLimit(apiKey.id, apiKey.requestsPerMinute);
    if (!allowed) {
      if (reservation) {
        await finalizeRollingWindowReleaseOnly(prisma, apiKey.id, reservation);
      }
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
    return { apiKey, quotaReservation: reservation };
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

  return { apiKey, quotaReservation: null };
}

/** Undo a reservation without adding real usage (rate-limit rejection path). */
async function finalizeRollingWindowReleaseOnly(
  prismaClient: PrismaClient,
  apiKeyId: string,
  reservation: RollingQuotaReservation,
): Promise<void> {
  await finalizeRollingWindowTokens(prismaClient, apiKeyId, reservation, 0);
}
