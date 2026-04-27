"use client";

import { useEffect, useState } from "react";

type KeyRow = {
  id: string;
  label: string;
  key: string;
  tokenBudget: number;
  tokensUsed: number;
  requestsPerMinute: number;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
};

export default function AdminKeysPage() {
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetch("/api/admin/keys").then((r) => r.json()).then((data: KeyRow[]) => setRows(data));
  }, []);

  const testKey = async (id: string) => {
    setTestingId(id);
    setResultById((prev) => ({ ...prev, [id]: "Testing..." }));
    try {
      const response = await fetch(`/api/admin/keys/${id}/test`, { method: "POST" });
      const data = (await response.json()) as { status?: number; payload?: { error?: { message?: string } } };
      const label = response.ok
        ? `OK (${data.status ?? 200})`
        : `Fail (${data.status ?? response.status})${data.payload?.error?.message ? `: ${data.payload.error.message}` : ""}`;
      setResultById((prev) => ({ ...prev, [id]: label }));
    } catch {
      setResultById((prev) => ({ ...prev, [id]: "Fail (network error)" }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-4xl italic">Admin Keys</h1>
      <div className="card overflow-auto p-4">
        <table className="mono w-full text-xs">
          <thead><tr><th className="text-left">Label</th><th className="text-left">Key</th><th className="text-left">Budget</th><th className="text-left">Used%</th><th className="text-left">Req/min</th><th className="text-left">Status</th><th className="text-left">Test</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.label}</td><td>{row.key}</td><td>{row.tokenBudget}</td><td>{Math.round((row.tokensUsed / Math.max(1, row.tokenBudget)) * 100)}%</td><td>{row.requestsPerMinute}</td><td>{row.status}</td><td><div className="flex items-center gap-2"><button type="button" className="border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)] disabled:opacity-50" onClick={() => void testKey(row.id)} disabled={testingId === row.id}>{testingId === row.id ? "Testing..." : "Test Key"}</button>{resultById[row.id] ? <span className="text-[var(--text-muted)]">{resultById[row.id]}</span> : null}</div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
