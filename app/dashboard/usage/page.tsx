"use client";

import { useEffect, useMemo, useState } from "react";

type UsageRow = {
  id: string;
  createdAt: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  statusCode: number;
  cached: boolean;
  apiKey: { label: string; key: string };
};

export default function UsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [range, setRange] = useState("30");
  const [model, setModel] = useState("");
  const [keyId, setKeyId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Number(range));
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      model,
      keyId,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    void fetch(`/api/user/usage?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { logs: UsageRow[]; pages: number }) => {
        setRows(d.logs ?? []);
        setPages(d.pages ?? 1);
      });
  }, [range, model, keyId, page]);

  const csv = useMemo(() => {
    const header = "Time,Key,Model,Input Tokens,Output Tokens,Total,Duration,Cached,Status";
    const lines = rows.map((r) => `${r.createdAt},${r.apiKey?.label ?? ""},${r.model},${r.inputTokens},${r.outputTokens},${r.totalTokens},${r.durationMs},${r.cached},${r.statusCode}`);
    return [header, ...lines].join("\n");
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-italic text-4xl">Usage</h1>
        <div className="mono flex items-center gap-2 text-xs">
          <select className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7d</option><option value="30">Last 30d</option><option value="90">Last 90d</option>
          </select>
          <select className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">All models</option><option value="claude-opus-4-6">Opus</option><option value="claude-sonnet-4-6">Sonnet</option><option value="claude-haiku-4-5">Haiku</option>
          </select>
          <input className="w-40 border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1" placeholder="Key ID filter" value={keyId} onChange={(e) => setKeyId(e.target.value)} />
        </div>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="opusx-usage.csv" className="mono border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]">
          Export CSV
        </a>
      </div>
      <div className="card overflow-auto p-4">
        <table className="mono w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-3 text-left">Time</th>
              <th className="px-2 py-3 text-left">Key</th>
              <th className="px-2 py-3 text-left">Model</th>
              <th className="px-2 py-3 text-left">Input</th>
              <th className="px-2 py-3 text-left">Output</th>
              <th className="px-2 py-3 text-left">Total</th>
              <th className="px-2 py-3 text-left">Duration</th>
              <th className="px-2 py-3 text-left">Cached</th>
              <th className="px-2 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <td className="px-2 py-3">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-2 py-3">{row.apiKey?.label ?? "-"}</td>
                <td className="px-2 py-3">{row.model}</td>
                <td className="px-2 py-3">{row.inputTokens}</td>
                <td className="px-2 py-3">{row.outputTokens}</td>
                <td className="px-2 py-3">{row.totalTokens}</td>
                <td className="px-2 py-3">{row.durationMs}ms</td>
                <td className="px-2 py-3">{row.cached ? "yes" : "no"}</td>
                <td className="px-2 py-3">{row.statusCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mono flex items-center justify-between text-xs text-[var(--text-muted)]">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
        <span>Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next →</button>
      </div>
    </div>
  );
}
