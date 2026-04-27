import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const [totalUsers, totalKeys, activeKeys, usage, tokenSums] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { status: "ACTIVE" } }),
    prisma.usageLog.aggregate({
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
    }),
    prisma.apiKey.aggregate({ _sum: { tokensUsed: true } }),
  ]);

  const totalTokens = usage._sum.totalTokens ?? Number(tokenSums._sum.tokensUsed ?? BigInt(0));
  const totalRequests = usage._count.id;
  const inputTokens = usage._sum.inputTokens ?? 0;
  const outputTokens = usage._sum.outputTokens ?? 0;
  const estimatedCost = inputTokens * 0.000003 + outputTokens * 0.000015;

  return NextResponse.json({
    totalUsers,
    totalKeys,
    activeKeys,
    totalRequests,
    totalTokens,
    estimatedCost: Number(estimatedCost.toFixed(6)),
  });
}
