type MinuteCounter = {
  minute: number;
  count: number;
};

const bucket = new Map<string, MinuteCounter>();

export function checkRateLimit(apiKeyId: string, requestsPerMinute: number): boolean {
  const minute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${apiKeyId}:${minute}`;
  const current = bucket.get(key);

  if (!current) {
    bucket.set(key, { minute, count: 1 });
    return true;
  }

  if (current.count >= requestsPerMinute) {
    return false;
  }

  current.count += 1;
  bucket.set(key, current);
  return true;
}
