import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[rgba(255,253,248,0.65)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="display-italic text-2xl">OpusX</p>
          <p className="mono mt-1 text-xs text-[var(--text-muted)]">Anthropic-compatible API gateway</p>
          <p className="mt-4 text-[var(--text-muted)]">
            Full Claude lineup through one API key with budgets, windows, and multi-tenant control.
          </p>
        </div>
        <div className="mono text-sm text-[var(--text-muted)]">
          <p className="mb-3 text-[var(--text)]">Product</p>
          <div className="space-y-2">
            <Link href="/docs" className="block hover:text-[var(--text)]">Documentation</Link>
            <Link href="/key-status" className="block hover:text-[var(--text)]">Check Usage</Link>
            <Link href="/status" className="block hover:text-[var(--text)]">Status</Link>
          </div>
        </div>
        <div className="mono text-sm text-[var(--text-muted)]">
          <p className="mb-3 text-[var(--text)]">Fine print</p>
          <div className="space-y-2">
            <Link href="/terms" className="block hover:text-[var(--text)]">Terms of use</Link>
            <Link href="/privacy" className="block hover:text-[var(--text)]">Privacy policy</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-2 px-6 py-4 text-xs text-[var(--text-muted)] md:flex-row">
          <p className="mono">© 2026 OpusX · opusx.vercel.app</p>
          <p className="mono">Built for teams and resellers.</p>
        </div>
      </div>
    </footer>
  );
}
