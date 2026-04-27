import { subDays } from "date-fns";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UsageChart } from "@/components/dashboard/UsageChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const now = new Date();
  const since = subDays(now, 30);
  const [usage, keys, logs] = await Promise.all([
    prisma.usageLog.findMany({
      where: { createdAt: { gte: since }, userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.apiKey.findMany({
      where: { userId },
    }),
    prisma.usageLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalTokens = usage.reduce((sum, log) => sum + log.totalTokens, 0);
  const activeKeys = keys.filter((key) => key.status === "ACTIVE");
  const budgetRemaining = activeKeys.reduce((sum, key) => sum + Number(key.tokenBudget - key.tokensUsed), 0);
  const dataMap = new Map<string, number>();
  usage.forEach((u) => {
    const key = u.createdAt.toISOString().slice(0, 10);
    dataMap.set(key, (dataMap.get(key) ?? 0) + u.totalTokens);
  });
  const chartData = [...dataMap.entries()].map(([date, tokens]) => ({ date, tokens }));
  const stats = [
    { label: "Total Tokens Used", value: totalTokens.toLocaleString() },
    { label: "Requests This Month", value: usage.length.toLocaleString() },
    { label: "Active Keys", value: activeKeys.length.toLocaleString() },
    { label: "Budget Remaining", value: budgetRemaining.toLocaleString() },
  ];

  return (
    <div className="space-y-10 pb-16 md:pb-0">
      <header className="space-y-2">
        <p className="section-marker">§ Dashboard</p>
        <h1 className="display-italic text-4xl md:text-5xl">Overview</h1>
        <p className="mono text-xs text-[var(--text-muted)]">
          {session?.user?.email} · {session?.user?.role}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="card p-5">
            <p className="mono text-xs text-[var(--text-muted)]">{stat.label}</p>
            <p className="mt-2 text-2xl md:text-3xl">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="display-italic text-2xl md:text-3xl">Usage trend</h2>
          <p className="text-sm text-[var(--text-muted)]">Last 30 days of token usage.</p>
        </div>
        <UsageChart data={chartData} />
      </section>

      <section className="card p-5 md:p-6">
        <h2 className="display-italic text-2xl">Recent activity</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Most recent 10 requests.</p>

        <div className="mono mt-4 overflow-x-auto text-xs">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2 pr-3 text-left font-normal">Time</th>
                <th className="py-2 pr-3 text-left font-normal">Model</th>
                <th className="py-2 pr-3 text-left font-normal">Tokens</th>
                <th className="py-2 pr-3 text-left font-normal">Duration</th>
                <th className="py-2 text-left font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border)]/70">
                  <td className="py-2 pr-3 text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">{log.model}</td>
                  <td className="py-2 pr-3">{log.totalTokens.toLocaleString()}</td>
                  <td className="py-2 pr-3">{log.durationMs}ms</td>
                  <td className="py-2">{log.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
