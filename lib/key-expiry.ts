/**
 * Whether an API key is past its expiration.
 *
 * If `expiresAt` is exactly UTC midnight (common for `<input type="date">`), the key is treated
 * as valid through the end of that UTC calendar day. Otherwise the stored instant is used.
 */
export function isApiKeyExpired(
  expiresAt: Date | null | undefined,
  /** For tests; defaults to `Date.now()`. */
  nowMs: number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const atMidnightUtc =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  if (atMidnightUtc) {
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const day = d.getUTCDate();
    const endOfUtcDayMs = Date.UTC(y, mo, day, 23, 59, 59, 999);
    return nowMs > endOfUtcDayMs;
  }

  return nowMs >= d.getTime();
}
