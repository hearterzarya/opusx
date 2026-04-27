import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

const sections = [
  "What passes through",
  "What is never stored",
  "What we do store",
  "Account data",
  "Upstream providers",
  "Operational logs",
  "Security",
  "Changes and contact",
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="section-marker">§ Privacy</p>
        <h1 className="display-italic mt-4 text-6xl">What we see, and what we don&apos;t.</h1>
        <p className="mt-2 text-[var(--text-muted)]">Last revised: 17 April 2026</p>
        <div className="card mt-8 bg-[var(--surface-2)] p-4 text-[var(--text-muted)]">
          The short version: prompts and responses are not stored. We keep token counts and timestamps because budgets have to be enforced somehow.
        </div>
        <div className="mt-10 space-y-8">
          {sections.map((title, index) => (
            <section key={title}>
              <p className="mono text-xs text-[var(--text-muted)]">— {String(index + 1).padStart(2, "0")}</p>
              <h2 className="display-italic mt-2 text-3xl">{title}</h2>
              <p className="mt-2 text-[var(--text-muted)]">This section explains {title.toLowerCase()} in plain English.</p>
            </section>
          ))}
        </div>
        <p className="display-italic mt-14 border-t border-b border-[var(--border)] py-6 text-center text-2xl">— Questions? Your admin has the answers. —</p>
        <div className="mono mt-6 flex gap-5 text-sm text-[var(--text-muted)]">
          <Link href="/terms">Terms</Link>
          <Link href="/">← Home</Link>
        </div>
      </main>
    </>
  );
}
