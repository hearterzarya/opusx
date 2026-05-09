-- Fixed 5-hour quota window counters (enforcement source of truth).
ALTER TABLE "ApiKey" ADD COLUMN "quotaWindowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApiKey" ADD COLUMN "quotaWindowConsumed" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN "quotaWindowEpoch" INTEGER NOT NULL DEFAULT 0;

-- Approximate prior sliding-window usage into the new window so limits stay consistent across deploy.
UPDATE "ApiKey" AS k
SET "quotaWindowConsumed" = COALESCE(s.total, 0)
FROM (
  SELECT "apiKeyId", SUM("totalTokens")::bigint AS total
  FROM "UsageLog"
  WHERE "createdAt" > (CURRENT_TIMESTAMP - INTERVAL '5 hours')
  GROUP BY "apiKeyId"
) AS s
WHERE k.id = s."apiKeyId";
