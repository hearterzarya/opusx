/**
 * Anthropic Messages clients that send `stream: true` expect `text/event-stream` (SSE).
 * Returning JSON (even with HTTP 200) breaks many SDKs and causes fake "assistant" fallback text.
 * This wraps JSON error payloads as a minimal SSE `event: error` stream.
 *
 * @see https://docs.anthropic.com/en/api/messages-streaming
 */
export async function adaptJsonErrorToSseIfStreaming(
  stream: boolean,
  errorResponse: Response,
): Promise<Response> {
  if (!stream) return errorResponse;

  const text = await errorResponse.clone().text();
  let anthropicError: { type: "error"; error: Record<string, unknown> };
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (j.type === "error" && j.error && typeof j.error === "object") {
      anthropicError = { type: "error", error: j.error as Record<string, unknown> };
    } else if (typeof j.error === "string") {
      anthropicError = { type: "error", error: { type: "api_error", message: j.error } };
    } else {
      anthropicError = {
        type: "error",
        error: {
          type: "api_error",
          message: text.length > 0 ? text : `Request failed (${errorResponse.status})`,
        },
      };
    }
  } catch {
    anthropicError = {
      type: "error",
      error: {
        type: "api_error",
        message: text.length > 0 ? text : `Request failed (${errorResponse.status})`,
      },
    };
  }

  const sse = `event: error\ndata: ${JSON.stringify(anthropicError)}\n\n`;
  const status = errorResponse.status >= 400 ? errorResponse.status : 200;
  return new Response(sse, {
    status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
