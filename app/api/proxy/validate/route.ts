import { NextResponse } from "next/server";
import { z } from "zod";
import { validateProxyKey } from "@/lib/proxy";

const schema = z.object({
  key: z.string().startsWith("sk-ant-ox-"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await validateProxyKey(body.key);
    if (!result.apiKey) {
      return result.error ?? NextResponse.json({ error: "Invalid key" }, { status: 401 });
    }
    return NextResponse.json({
      valid: true,
      keyId: result.apiKey.id,
      status: result.apiKey.status,
      expiresAt: result.apiKey.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
