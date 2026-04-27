"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type ApiKey = {
  id: string;
  key: string;
  label: string;
  tokenBudget: number;
  tokensUsed: number;
  requestsPerMinute: number;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiresAt: string | null;
};

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/user/keys")
      .then((response) => response.json())
      .then((data: ApiKey[]) => setKeys(data));
  }, []);

  const create = async () => {
    const response = await fetch("/api/user/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = (await response.json()) as ApiKey & { plainKey?: string; error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Failed to create key");
      return;
    }
    setNewKey(data.plainKey ?? null);
    setLabel("");
    void fetch("/api/user/keys")
      .then((response) => response.json())
      .then((data: ApiKey[]) => setKeys(data));
  };

  const revoke = async (id: string) => {
    await fetch(`/api/user/keys/${id}`, { method: "DELETE" });
    void fetch("/api/user/keys")
      .then((response) => response.json())
      .then((data: ApiKey[]) => setKeys(data));
  };

  return (
    <div className="space-y-8">
      <h1 className="display-italic text-4xl">API Keys</h1>
      <div className="card p-4">
        <p className="mono mb-2 text-xs text-[var(--warning)]">Save this key after creation — it will only be shown once.</p>
        <div className="flex gap-2">
          <input className="mono flex-1 border border-[var(--border)] bg-[var(--code-bg)] p-2" placeholder="Key label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button type="button" className="mono border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)]" onClick={create}>Create New Key</button>
        </div>
        {newKey && <p className="mono mt-3 text-sm text-[var(--success)]">{newKey}</p>}
      </div>
      <section className="grid gap-3">
        {keys.map((key) => (
          <article key={key.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="display-italic text-2xl">{key.label}</p>
                <p className="mono text-xs text-[var(--text-muted)]">{key.key}</p>
              </div>
              {key.status === "ACTIVE" && (
                <button type="button" className="mono border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--surface-2)]" onClick={() => revoke(key.id)}>Revoke</button>
              )}
            </div>
            <div className="mono mt-2 text-xs text-[var(--text-muted)]">Status: {key.status}</div>
            <div className="mono mt-1 text-xs text-[var(--text-muted)]">{key.tokensUsed.toLocaleString()} / {key.tokenBudget.toLocaleString()} tokens</div>
          </article>
        ))}
      </section>
    </div>
  );
}
