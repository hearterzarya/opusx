import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await context.params;
  const apiKey = await prisma.apiKey.findUnique({ where: { id } });
  if (!apiKey) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  const targetUrl = new URL("/api/v1/messages", request.url).toString();
  const startedAt = Date.now();

  const probeResponse = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey.key,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with the single word: pong" }],
    }),
  });

  let payload: unknown = null;
  try {
    payload = await probeResponse.json();
  } catch {
    payload = null;
  }

  return NextResponse.json({
    ok: probeResponse.ok,
    status: probeResponse.status,
    durationMs: Date.now() - startedAt,
    payload,
  });
}
