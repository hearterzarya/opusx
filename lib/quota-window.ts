/** Five-hour fixed quota window length (matches product / admin UI). */
export const ROLLING_QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000;

export type RolledQuotaWindow = {
  quotaWindowStartedAtMs: number;
  quotaWindowConsumed: bigint;
  quotaWindowEpoch: number;
  windowRolled: boolean;
};

/**
 * Advance a fixed window anchored at `quotaWindowStartedAt` until `nowMs` lies inside
 * [start, start + ROLLING_QUOTA_WINDOW_MS). Each full window crossed resets consumed tokens to 0
 * and bumps epoch.
 */
export function rollQuotaWindow(
  quotaWindowStartedAtMs: number,
  quotaWindowConsumed: bigint,
  quotaWindowEpoch: number,
  nowMs: number,
): RolledQuotaWindow {
  let start = quotaWindowStartedAtMs;
  let consumed = quotaWindowConsumed;
  let epoch = quotaWindowEpoch;
  let windowRolled = false;
  const w = ROLLING_QUOTA_WINDOW_MS;

  while (nowMs - start >= w) {
    start += w;
    consumed = BigInt(0);
    epoch += 1;
    windowRolled = true;
  }

  return {
    quotaWindowStartedAtMs: start,
    quotaWindowConsumed: consumed,
    quotaWindowEpoch: epoch,
    windowRolled,
  };
}

export function quotaWindowEndsAtMs(quotaWindowStartedAtMs: number): number {
  return quotaWindowStartedAtMs + ROLLING_QUOTA_WINDOW_MS;
}
