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

export function parseUsageTokens(
  responseBody: Record<string, unknown> | undefined,
  fallbackInputTokens: number,
): { inputTokens: number; outputTokens: number; totalTokens: number } {
  const usage = responseBody?.usage as
    | { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number }
    | undefined;

  const inputTokens = usage?.input_tokens ?? fallbackInputTokens;
  const outputTokens = usage?.output_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}
