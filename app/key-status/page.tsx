"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type KeyStatus = {
  status: string;
  label: string;
  tokenBudget: number;
  tokensUsed: number;
  usagePercent: number;
  rollingWindowUsed: number;
  rollingWindowLimit: number;
  requestsPerMinute: number;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  windowResetAt: string | null;
  totalRequests: number;
  requests24h: number;
  tokens24h: number;
  avgLatencyMs24h: number;
};

export default function KeyStatusPage() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  const formatRelative = (value: string | null) => {
    if (!value) return "Not started";
    if (!checkedAt) return "Not started";
    const ms = checkedAt - new Date(value).getTime();
    if (ms < 60_000) return "just now";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatRemaining = (value: string | null) => {
    if (!value) return "No expiry";
    if (!checkedAt) return "No expiry";
    const ms = new Date(value).getTime() - checkedAt;
    if (ms <= 0) return "Expired";
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return `${days} days remaining`;
  };

  const check = async () => {
    if (!key.trim()) {
      toast.error("Enter a key first");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/key-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = (await response.json()) as KeyStatus | { error: string };
      if (!response.ok || "error" in data) {
        toast.error("Key check failed");
        return;
      }
      setStatus(data);
      setCheckedAt(Date.now());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <p className="section-marker">§ Usage lookup</p>
      <h1 className="display-italic text-5xl">Check the state of a key.</h1>
      <p className="max-w-3xl text-[var(--text-muted)]">
        Paste any OpusX key below. You&apos;ll see 5-hour window usage, reset timing, and 24-hour request metrics.
      </p>
      <div className="card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="mono h-12 flex-1 border border-[var(--border)] bg-[var(--code-bg)] px-4"
            placeholder="sk-ant-ox-..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary h-12 min-w-32"
            onClick={check}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </div>
      </div>
      {status && (
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="mono text-xs text-[var(--text-muted)]">Key {status.label}</p>
                <p className="mono text-sm">sk-ant-ox-****{key.slice(-8)}</p>
              </div>
              <span className="mono rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs">
                {status.status}
              </span>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="card p-5">
              <h2 className="display-italic text-2xl">5-Hour Window</h2>
              <div className="mt-4 flex items-center gap-6">
                <div
                  className="grid h-32 w-32 place-items-center rounded-full border border-[var(--border)] text-center"
                  style={{
                    background: `conic-gradient(var(--accent) ${Math.min(status.usagePercent, 100)}%, var(--surface-2) 0)`,
                  }}
                >
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--surface)]">
                    <p className="mono text-xl">{Math.round(status.usagePercent)}%</p>
                  </div>
                </div>
                <div className="mono space-y-2 text-sm">
                  <p>Used: {formatCompact(status.rollingWindowUsed)}</p>
                  <p>Remaining: {formatCompact(Math.max(status.rollingWindowLimit - status.rollingWindowUsed, 0))}</p>
                  <p>Budget: {formatCompact(status.rollingWindowLimit)}</p>
                </div>
              </div>
            </article>

            <article className="card p-5">
              <h2 className="display-italic text-2xl">Window Reset</h2>
              <div className="mono mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                <p className="flex justify-between gap-3"><span>Window reset</span><span className="text-[var(--text)]">{status.windowResetAt ? new Date(status.windowResetAt).toLocaleString() : "Not started"}</span></p>
                <p className="flex justify-between gap-3"><span>Created</span><span className="text-[var(--text)]">{new Date(status.createdAt).toLocaleDateString()}</span></p>
                <p className="flex justify-between gap-3"><span>Expires</span><span className="text-[var(--text)]">{formatRemaining(status.expiresAt)}</span></p>
                <p className="flex justify-between gap-3"><span>Last used</span><span className="text-[var(--text)]">{formatRelative(status.lastUsedAt)}</span></p>
                <p className="flex justify-between gap-3"><span>Rate limit</span><span className="text-[var(--text)]">{status.requestsPerMinute} req/min</span></p>
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <article className="card p-4">
              <p className="mono text-xs text-[var(--text-muted)]">Total requests</p>
              <p className="mt-2 text-3xl">{status.totalRequests.toLocaleString()}</p>
            </article>
            <article className="card p-4">
              <p className="mono text-xs text-[var(--text-muted)]">24H requests</p>
              <p className="mt-2 text-3xl">{status.requests24h.toLocaleString()}</p>
            </article>
            <article className="card p-4">
              <p className="mono text-xs text-[var(--text-muted)]">24H tokens</p>
              <p className="mt-2 text-3xl">{formatCompact(status.tokens24h)}</p>
            </article>
            <article className="card p-4">
              <p className="mono text-xs text-[var(--text-muted)]">Avg latency</p>
              <p className="mt-2 text-3xl">{(status.avgLatencyMs24h / 1000).toFixed(1)}s</p>
            </article>
          </section>
        </div>
      )}
    </main>
  );
}
