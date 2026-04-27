import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-24 px-6 py-10 md:py-12">
        <section className="hero-shell relative overflow-hidden px-6 py-8 md:px-10 md:py-11 lg:px-12">
          <span className="absolute left-[7%] top-[20%] h-1.5 w-1.5 rounded-full bg-[var(--accent)]/45" />
          <span className="absolute right-[18%] top-[26%] h-1.5 w-1.5 rounded-full bg-[var(--accent)]/35" />
          <span className="absolute bottom-[16%] left-[10%] h-1 w-1 rounded-full bg-[var(--accent)]/30" />
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-5">
              <p className="mono inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
                Full Claude Lineup — One API Key
              </p>
              <h1 className="display-italic max-w-[560px] text-[56px] leading-[0.98] md:text-[66px]">
                Opus 4.7, Sonnet &amp; Haiku
                <span className="hero-accent-line mt-1 block text-[var(--accent)]">Ready in 60 Seconds</span>
              </h1>
              <p className="max-w-[560px] text-base leading-relaxed text-[var(--text-muted)]">
                Get instant access to the full Claude model lineup. Drop-in Anthropic API compatible — just swap your base URL and start coding with Claude Code, Cursor, or any SDK.
              </p>
              <div className="mono flex flex-wrap gap-3">
                <Link href="/docs" className="btn-primary">
                  Get Started
                </Link>
                <Link href="/docs" className="btn-outline">
                  View Docs
                </Link>
              </div>
              <p className="mono text-xs text-[var(--text-muted)]">
                Streaming SSE &nbsp;•&nbsp; Per-Key Budgets &nbsp;•&nbsp; Prompt Caching
              </p>
            </div>

            <div className="terminal-shell mono p-4 text-left text-sm text-[var(--text-muted)]">
              <p className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs">
                <span className="terminal-title-dot bg-[#ff6568]" />
                <span className="terminal-title-dot bg-[#fac800]" />
                <span className="terminal-title-dot bg-[#05df72]" />
                <span className="ml-2">claude-code — bash</span>
              </p>
              <p>$ export ANTHROPIC_BASE_URL=https://api.opusx.pro</p>
              <p>$ export ANTHROPIC_API_KEY=sk-ant-ox-...</p>
              <p>$ claude</p>
              <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--code-bg)] p-4 text-[var(--text)]">
                <p>✓ Connected to OpusX Gateway</p>
                <p>Model: claude-sonnet-4-6</p>
                <p>Budget: 2.4M / 5M tokens</p>
                <p>Window: 4h 12m remaining</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="display-italic text-4xl">Everything you need to manage AI access</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Per-Key Token Budgets", "Set 5-hour rolling window limits per API key. Automatic resets — no manual intervention."],
              ["Usage Tracking", "Every request logged with model, tokens, latency, and status. Full admin dashboard."],
              ["Key Isolation", "Each key gets independent rate limits, budgets, and expiry. Multi-tenant by default."],
              ["Streaming Support", "Full SSE streaming pass-through. First tokens arrive instantly — zero buffering."],
              ["Drop-in Compatible", "Anthropic API-compatible. Works with Claude Code, Python SDK, TypeScript SDK."],
              ["Smart Caching", "Prompt caching enabled by default. Cache tokens excluded from user budgets."],
            ].map(([title, desc]) => (
              <article key={title} className="card p-5">
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="mt-2 text-[var(--text-muted)]">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="display-italic text-4xl">Start in 3 steps</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["1", "Get Your Key", "Receive an API key from your admin or reseller."],
              ["2", "Set Base URL", "Point your client to api.opusx.pro."],
              ["3", "Start Building", "Use Claude Code, SDK, or cURL exactly like Anthropic API."],
            ].map(([num, title, desc]) => (
              <article key={title} className="card p-5">
                <p className="mono text-xs text-[var(--accent)]">{num}</p>
                <h3 className="mt-2 text-xl">{title}</h3>
                <p className="mt-2 text-[var(--text-muted)]">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="display-italic text-4xl">Full Claude lineup</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="card p-5"><p className="mono text-xs text-[var(--accent)]">Premium</p><h3 className="mt-2 text-xl">Opus 4.7</h3><p className="mono mt-1 text-sm text-[var(--text-muted)]">claude-opus-4-7</p><p className="mt-2 text-[var(--text-muted)]">Most capable flagship.</p></article>
            <article className="card p-5"><p className="mono text-xs text-[var(--accent)]">Popular</p><h3 className="mt-2 text-xl">Sonnet 4.6</h3><p className="mono mt-1 text-sm text-[var(--text-muted)]">claude-sonnet-4-6</p><p className="mt-2 text-[var(--text-muted)]">Best balance of speed and intelligence.</p></article>
            <article className="card p-5"><p className="mono text-xs text-[var(--accent)]">Fast</p><h3 className="mt-2 text-xl">Haiku 4.5</h3><p className="mono mt-1 text-sm text-[var(--text-muted)]">claude-haiku-4-5-20251001</p><p className="mt-2 text-[var(--text-muted)]">Fastest responses for high throughput.</p></article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
