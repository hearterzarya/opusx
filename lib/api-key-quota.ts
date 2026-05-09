import type { ApiKey, Prisma, PrismaClient } from "@prisma/client";
import { quotaWindowEndsAtMs, rollQuotaWindow } from "@/lib/quota-window";

export type RollingQuotaReservation = {
  epoch: number;
  reserved: number;
};

export type RollingQuotaBlocked = {
  resetAtMs: number;
  retryAfterMs: number;
  limit: bigint;
  consumed: bigint;
};

function isUnlimitedRolling(limit: bigint): boolean {
  return limit <= BigInt(0);
}

async function lockApiKeyRow(tx: Prisma.TransactionClient, apiKeyId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "ApiKey" WHERE "id" = ${apiKeyId} FOR UPDATE`;
}

/**
 * Rolls the fixed window, then reserves `reserveTokens` against rollingWindowLimit.
 * @returns null when OK, or blocked metadata when the request must be rejected.
 */
export async function reserveRollingWindowTokens(
  prisma: PrismaClient,
  apiKeyId: string,
  reserveTokens: number,
  now: Date = new Date(),
): Promise<{ blocked: RollingQuotaBlocked | null; reservation: RollingQuotaReservation | null }> {
  if (!Number.isFinite(reserveTokens) || reserveTokens < 0) {
    reserveTokens = 0;
  }
  const reserve = Math.min(reserveTokens, Number.MAX_SAFE_INTEGER);

  return prisma.$transaction(async (tx) => {
    await lockApiKeyRow(tx, apiKeyId);
    const key = await tx.apiKey.findUnique({ where: { id: apiKeyId } });
    if (!key) {
      return { blocked: null, reservation: null };
    }

    const limit = key.rollingWindowLimit;
    if (isUnlimitedRolling(limit)) {
      return { blocked: null, reservation: null };
    }

    const nowMs = now.getTime();
    const rolled = rollQuotaWindow(
      key.quotaWindowStartedAt.getTime(),
      key.quotaWindowConsumed,
      key.quotaWindowEpoch,
      nowMs,
    );

    const consumedAfterRoll = rolled.quotaWindowConsumed;
    const reserveBn = BigInt(reserve);

    if (consumedAfterRoll >= limit) {
      const resetAtMs = quotaWindowEndsAtMs(rolled.quotaWindowStartedAtMs);
      return {
        blocked: {
          resetAtMs,
          retryAfterMs: Math.max(0, resetAtMs - nowMs),
          limit,
          consumed: consumedAfterRoll,
        },
        reservation: null,
      };
    }

    if (consumedAfterRoll + reserveBn > limit) {
      const resetAtMs = quotaWindowEndsAtMs(rolled.quotaWindowStartedAtMs);
      return {
        blocked: {
          resetAtMs,
          retryAfterMs: Math.max(0, resetAtMs - nowMs),
          limit,
          consumed: consumedAfterRoll,
        },
        reservation: null,
      };
    }

    const nextConsumed = consumedAfterRoll + reserveBn;

    await tx.apiKey.update({
      where: { id: apiKeyId },
      data: {
        quotaWindowStartedAt: new Date(rolled.quotaWindowStartedAtMs),
        quotaWindowEpoch: rolled.quotaWindowEpoch,
        quotaWindowConsumed: nextConsumed,
      },
    });

    return {
      blocked: null,
      reservation: { epoch: rolled.quotaWindowEpoch, reserved: reserve },
    };
  });
}

/**
 * Adjusts consumed tokens after upstream completes: replaces the reservation with actual usage.
 * If the quota window rolled during the upstream call, the reservation is dropped and only
 * `actualTokens` is applied in the new window (epoch mismatch path).
 */
export async function finalizeRollingWindowTokens(
  prisma: PrismaClient,
  apiKeyId: string,
  reservation: RollingQuotaReservation,
  actualTokens: number,
  now: Date = new Date(),
): Promise<void> {
  if (!Number.isFinite(actualTokens) || actualTokens < 0) {
    actualTokens = 0;
  }
  const actual = Math.min(actualTokens, Number.MAX_SAFE_INTEGER);

  await prisma.$transaction(async (tx) => {
    await lockApiKeyRow(tx, apiKeyId);
    const key = await tx.apiKey.findUnique({ where: { id: apiKeyId } });
    if (!key) return;

    if (isUnlimitedRolling(key.rollingWindowLimit)) {
      return;
    }

    const nowMs = now.getTime();
    const rolled = rollQuotaWindow(
      key.quotaWindowStartedAt.getTime(),
      key.quotaWindowConsumed,
      key.quotaWindowEpoch,
      nowMs,
    );

    let nextConsumed: bigint;
    if (reservation.epoch !== rolled.quotaWindowEpoch) {
      nextConsumed = rolled.quotaWindowConsumed + BigInt(actual);
    } else {
      nextConsumed = rolled.quotaWindowConsumed + BigInt(actual - reservation.reserved);
    }

    if (nextConsumed < BigInt(0)) {
      nextConsumed = BigInt(0);
    }

    const limit = key.rollingWindowLimit;
    if (limit > BigInt(0) && nextConsumed > limit) {
      nextConsumed = limit;
    }

    await tx.apiKey.update({
      where: { id: apiKeyId },
      data: {
        quotaWindowStartedAt: new Date(rolled.quotaWindowStartedAtMs),
        quotaWindowEpoch: rolled.quotaWindowEpoch,
        quotaWindowConsumed: nextConsumed,
      },
    });
  });
}

export type RollingQuotaKeyFields = Pick<
  ApiKey,
  "rollingWindowLimit" | "quotaWindowStartedAt" | "quotaWindowConsumed" | "quotaWindowEpoch"
>;

/** Read-only snapshot for dashboards / key-check (no lock). */
export function buildRollingQuotaView(key: RollingQuotaKeyFields, now: Date = new Date()) {
  const nowMs = now.getTime();
  const rolled = rollQuotaWindow(
    key.quotaWindowStartedAt.getTime(),
    key.quotaWindowConsumed,
    key.quotaWindowEpoch,
    nowMs,
  );

  const limit = key.rollingWindowLimit;
  const unlimited = isUnlimitedRolling(limit);
  const consumed = unlimited ? BigInt(0) : rolled.quotaWindowConsumed;
  const effectiveLimit = unlimited ? BigInt(0) : limit;
  const resetAtMs = quotaWindowEndsAtMs(rolled.quotaWindowStartedAtMs);
  const remaining =
    unlimited ? null : effectiveLimit > consumed ? effectiveLimit - consumed : BigInt(0);
  const blockedByQuota = !unlimited && consumed >= effectiveLimit;

  return {
    unlimited,
    quotaWindowStartedAt: new Date(rolled.quotaWindowStartedAtMs),
    windowResetAt: new Date(resetAtMs),
    rollingWindowUsed: consumed,
    rollingWindowLimit: effectiveLimit,
    remainingInWindow: remaining,
    blockedByQuota,
    quotaWindowEpoch: rolled.quotaWindowEpoch,
    retryAfterMs: blockedByQuota ? Math.max(0, resetAtMs - nowMs) : 0,
  };
}
