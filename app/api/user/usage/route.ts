import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? 25), 100);
  const model = url.searchParams.get("model") ?? "";
  const keyId = url.searchParams.get("keyId") ?? "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const chart = url.searchParams.get("chart") === "true";
  const days = Number(url.searchParams.get("days") ?? 30);
  const skip = (page - 1) * pageSize;
  const where = {
    userId: result.session.user.id,
    ...(model ? { model } : {}),
    ...(keyId ? { apiKeyId: keyId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  if (chart) {
    const rows = await prisma.usageLog.findMany({
      where: {
        userId: result.session.user.id,
        createdAt: { gte: subDays(new Date(), days) },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, totalTokens: true },
    });
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const date = row.createdAt.toISOString().slice(0, 10);
      map.set(date, (map.get(date) ?? 0) + row.totalTokens);
    });
    return NextResponse.json([...map.entries()].map(([date, totalTokens]) => ({ date, totalTokens })));
  }

  const [logs, total] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        apiKey: {
          select: { label: true, key: true },
        },
      },
    }),
    prisma.usageLog.count({
      where,
    }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
