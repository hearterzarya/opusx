import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [users, keys, activeKeys, usage, topUsers] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { status: "ACTIVE" } }),
    prisma.usageLog.aggregate({ _sum: { totalTokens: true, inputTokens: true, outputTokens: true }, _count: { id: true } }),
    prisma.user.findMany({
      include: {
        usageLogs: {
          select: { totalTokens: true },
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      take: 10,
    }),
  ]);
  const estimatedCost = (usage._sum.inputTokens ?? 0) * 0.000003 + (usage._sum.outputTokens ?? 0) * 0.000015;

  const top = topUsers
    .map((user) => ({
      email: user.email,
      tokens: user.usageLogs.reduce((sum, log) => sum + log.totalTokens, 0),
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <h1 className="display-italic text-4xl">Admin Overview</h1>
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Total users</p><p className="text-2xl">{users}</p></article>
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Total keys</p><p className="text-2xl">{keys}</p></article>
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Total tokens</p><p className="text-2xl">{(usage._sum.totalTokens ?? 0).toLocaleString()}</p></article>
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Active keys</p><p className="text-2xl">{activeKeys}</p></article>
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Total requests</p><p className="text-2xl">{usage._count.id}</p></article>
        <article className="card p-4"><p className="mono text-xs text-[var(--text-muted)]">Estimated Anthropic cost</p><p className="text-2xl">${estimatedCost.toFixed(4)}</p></article>
      </section>
      <section className="card p-4">
        <h2 className="display-italic text-2xl">Top users by token usage (30d)</h2>
        <div className="mono mt-3 space-y-2 text-xs">{top.map((item) => <div key={item.email} className="flex justify-between border-b border-[var(--border)] py-3"><span className="text-[var(--text-muted)]">{item.email}</span><span>{item.tokens.toLocaleString()}</span></div>)}</div>
      </section>
    </div>
  );
}
