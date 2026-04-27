import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const userId = result.session.user.id;
  const [allTime, monthRequests, activeKeys] = await Promise.all([
    prisma.usageLog.aggregate({
      where: { userId },
      _sum: { totalTokens: true },
      _count: { id: true },
    }),
    prisma.usageLog.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date()),
        },
      },
    }),
    prisma.apiKey.count({
      where: {
        userId,
        status: "ACTIVE",
      },
    }),
  ]);

  return NextResponse.json({
    totalTokens: allTime._sum.totalTokens ?? 0,
    totalRequests: allTime._count.id,
    requestsThisMonth: monthRequests,
    activeKeys,
  });
}
