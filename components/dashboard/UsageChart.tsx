"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  data: { date: string; tokens: number }[];
};

export function UsageChart({ data }: Props) {
  return (
    <div className="card p-4">
      <p className="mono mb-4 text-sm text-[var(--text-muted)]">Daily token usage (30d)</p>
      <div className="h-72 min-h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" stroke="#8e877a" />
            <YAxis stroke="#8e877a" />
            <Tooltip />
            <Line type="monotone" dataKey="tokens" stroke="#e8e0d0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
