/**
 * Anthropic sometimes responds with HTTP 200 and a fake `message` whose `id` starts with
 * `msg_expired_` when the **platform** API key / billing is wrong — easy to confuse with the
 * customer's OpusX key. Detect that shape so we can return a clear gateway error instead.
 */
export function isAnthropicSyntheticPlatformKeyExpiry(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id.startsWith("msg_expired_")) return false;
  if (o.type !== "message" || o.role !== "assistant") return false;
  const content = o.content;
  if (!Array.isArray(content) || content.length === 0) return false;
  const first = content[0] as Record<string, unknown>;
  if (first?.type !== "text" || typeof first.text !== "string") return false;
  const text = first.text.toLowerCase();
  return text.includes("api key expired") || text.includes("administrator");
}
