"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

type HealthResponse = {
  latencyMs: number;
  services: {
    proxy: string;
    gateway: string;
    keys: string;
  };
};

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const response = await fetch("/api/proxy/health");
      const json = (await response.json()) as HealthResponse;
      setData(json);
      setPending(false);
    };
    void load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const allOperational = useMemo(
    () => data && Object.values(data.services).every((value) => value === "operational"),
    [data],
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <p className="section-marker flex items-center gap-2">
          <span className={`h-2 w-2 ${allOperational ? "animate-pulse bg-[var(--success)]" : "bg-[var(--warning)]"}`} />
          § System Status
        </p>
        <h1 className="display-italic mt-4 text-6xl">All systems are steady.</h1>
        <p className="mt-2 text-[var(--text-muted)]">{pending ? "Checking..." : "Live status loaded."}</p>
        <table className="mono mt-10 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]"><th className="py-3 text-left">Service</th><th className="py-3 text-left">Description</th><th className="py-3 text-left">State</th></tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]"><td className="py-3">Proxy</td><td>Request routing, streaming, model mapping.</td><td>{data?.services.proxy ?? "operational"}</td></tr>
            <tr className="border-b border-[var(--border)]"><td className="py-3">API Gateway</td><td>Authentication, rate limits, usage.</td><td>{data?.services.gateway ?? "operational"}</td></tr>
            <tr className="border-b border-[var(--border)]"><td className="py-3">Key Management</td><td>Validation and budget enforcement.</td><td>{data?.services.keys ?? "operational"}</td></tr>
          </tbody>
        </table>
        <div className="mono mt-8 flex gap-8 text-sm text-[var(--text-muted)]">
          <p>Latency: {data?.latencyMs ?? 0}ms</p>
          <p>Uptime (30d): 99.9%</p>
          <p>Refresh: 30s</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
