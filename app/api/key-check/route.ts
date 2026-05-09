import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildRollingQuotaView } from "@/lib/api-key-quota";
import { isApiKeyExpired } from "@/lib/key-expiry";

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
        quotaWindowStartedAt: true,
        quotaWindowConsumed: true,
        quotaWindowEpoch: true,
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

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

    const quotaView = buildRollingQuotaView(apiKey, now);

    const tokenBudget = Number(apiKey.tokenBudget);
    const tokensUsed = Number(apiKey.tokensUsed);
    const usagePercent = Number(((tokensUsed / Math.max(tokenBudget, 1)) * 100).toFixed(2));

    const rollingWindowLimit = quotaView.unlimited ? 0 : Number(quotaView.rollingWindowLimit);
    const rollingWindowUsed = quotaView.unlimited ? 0 : Number(quotaView.rollingWindowUsed);
    const rollingWindowUsagePercent = quotaView.unlimited
      ? 0
      : quotaView.rollingWindowLimit > BigInt(0)
        ? Number(((Number(quotaView.rollingWindowUsed) / Number(quotaView.rollingWindowLimit)) * 100).toFixed(2))
        : 0;

    const windowResetAt = quotaView.windowResetAt.toISOString();
    const quotaWindowStartedAt = quotaView.quotaWindowStartedAt.toISOString();

    const expired = isApiKeyExpired(apiKey.expiresAt, now.getTime());
    const quotaBlocked = quotaView.blockedByQuota && apiKey.status === "ACTIVE" && !expired;

    return NextResponse.json({
      status: apiKey.status,
      label: apiKey.label,
      tokenBudget,
      tokensUsed,
      usagePercent,
      rollingWindowUsed,
      rollingWindowLimit,
      rollingWindowUnlimited: quotaView.unlimited,
      rollingWindowUsagePercent,
      quotaBlocked,
      quotaWindowStartedAt,
      requestsPerMinute: apiKey.requestsPerMinute,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: latestUsage?.createdAt ?? null,
      windowResetAt,
      retryAfterMs: quotaView.retryAfterMs,
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
