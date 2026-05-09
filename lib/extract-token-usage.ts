export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function extractTokenUsage(data: any): TokenUsage {
  const usage =
    data?.usage ??
    data?.message?.usage ??
    data?.response?.usage ??
    {}

  const inputTokens = Number(
    usage?.input_tokens ??
    usage?.inputTokens ??
    data?.input_tokens ??
    0
  )

  const outputTokens = Number(
    usage?.output_tokens ??
    usage?.outputTokens ??
    data?.output_tokens ??
    0
  )

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  }
}
