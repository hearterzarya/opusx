import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
  tokenBudget: z.number().int().positive().optional(),
  requestsPerMinute: z.number().int().positive().optional(),
  rollingWindowLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await context.params;

  try {
    const body = updateSchema.parse(await request.json());
    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        status: body.status,
        tokenBudget: body.tokenBudget === undefined ? undefined : BigInt(body.tokenBudget),
        requestsPerMinute: body.requestsPerMinute,
        rollingWindowLimit: body.rollingWindowLimit === undefined ? undefined : BigInt(body.rollingWindowLimit),
        expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return NextResponse.json({
      ...updated,
      tokenBudget: Number(updated.tokenBudget),
      tokensUsed: Number(updated.tokensUsed),
      rollingWindowLimit: Number(updated.rollingWindowLimit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await context.params;

  try {
    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
