import { extractTokenUsage } from "@/lib/extract-token-usage";

export type TokenEstimateInput = {
  requestBody?: Record<string, unknown>;
  anthropicResponse?: Record<string, unknown>;
};

function roughTokensFromString(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function estimateInputTokens(body: Record<string, unknown> | undefined): number {
  if (!body) return 0;
  return roughTokensFromString(JSON.stringify(body));
}

/** Conservative reservation for the 5-hour rolling quota before upstream returns real usage. */
export function estimateQuotaReservationFromMessageBody(body: Record<string, unknown>): number {
  const maxTokensRaw = body.max_tokens;
  const maxTokens =
    typeof maxTokensRaw === "number" && Number.isFinite(maxTokensRaw)
      ? Math.max(0, Math.floor(maxTokensRaw))
      : 4096;
  const inputRough = estimateInputTokens(body);
  return Math.max(1, inputRough + maxTokens);
}

export function parseUsageTokens(
  responseBody: Record<string, unknown> | undefined,
  fallbackInputTokens: number,
): { inputTokens: number; outputTokens: number; totalTokens: number } {
  const usage = extractTokenUsage(responseBody);
  const inputTokens = usage.inputTokens > 0 ? usage.inputTokens : fallbackInputTokens;
  const outputTokens = usage.outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}
