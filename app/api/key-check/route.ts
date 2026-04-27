import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  key: z.string().startsWith("sk-ant-ox-"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: body.key },
      select: {
        id: true,
        userId: true,
        status: true,
        label: true,
        tokenBudget: true,
        tokensUsed: true,
        rollingWindowLimit: true,
        requestsPerMinute: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    if (!apiKey) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const canRead = session.user.role === "ADMIN" || apiKey.userId === session.user.id;
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const now = Date.now();
    const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const usage = await prisma.usageLog.aggregate({
      where: {
        apiKeyId: apiKey.id,
        createdAt: {
          gt: fiveHoursAgo,
        },
      },
      _sum: { totalTokens: true },
    });

    const [totalRequests, requests24h, tokens24h, avgLatency24h, latestUsage] = await Promise.all([
      prisma.usageLog.count({ where: { apiKeyId: apiKey.id } }),
      prisma.usageLog.count({ where: { apiKeyId: apiKey.id, createdAt: { gt: oneDayAgo } } }),
      prisma.usageLog.aggregate({
        where: { apiKeyId: apiKey.id, createdAt: { gt: oneDayAgo } },
        _sum: { totalTokens: true },
      }),
      prisma.usageLog.aggregate({
        where: { apiKeyId: apiKey.id, createdAt: { gt: oneDayAgo } },
        _avg: { durationMs: true },
      }),
      prisma.usageLog.findFirst({
        where: { apiKeyId: apiKey.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const tokenBudget = Number(apiKey.tokenBudget);
    const tokensUsed = Number(apiKey.tokensUsed);
    const usagePercent = Number(((tokensUsed / Math.max(tokenBudget, 1)) * 100).toFixed(2));
    const rollingWindowLimit = Number(apiKey.rollingWindowLimit ?? usage._sum.totalTokens ?? 0);
    const rollingWindowUsed = Number(usage._sum.totalTokens ?? 0);

    const windowResetAt = latestUsage ? new Date(latestUsage.createdAt.getTime() + 5 * 60 * 60 * 1000) : null;

    return NextResponse.json({
      status: apiKey.status,
      label: apiKey.label,
      tokenBudget,
      tokensUsed,
      usagePercent,
      rollingWindowUsed,
      rollingWindowLimit,
      requestsPerMinute: apiKey.requestsPerMinute,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: latestUsage?.createdAt ?? null,
      windowResetAt,
      totalRequests,
      requests24h,
      tokens24h: Number(tokens24h._sum.totalTokens ?? 0),
      avgLatencyMs24h: Math.round(avgLatency24h._avg.durationMs ?? 0),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid key format" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to check key" }, { status: 500 });
  }
}
