import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

const sections = [
  "The agreement",
  "What you can do",
  "What you can't do",
  "Keys and accounts",
  "Uptime, more or less",
  "Your content",
  "Liability",
  "Changes",
  "Termination",
  "Contact",
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="section-marker">§ Terms of use</p>
        <h1 className="display-italic mt-4 text-6xl">The rules, in plain English.</h1>
        <p className="mt-2 text-[var(--text-muted)]">Last revised: 17 April 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((title, index) => (
            <section key={title}>
              <p className="mono text-xs text-[var(--text-muted)]">— {String(index + 1).padStart(2, "0")}</p>
              <h2 className="display-italic mt-2 text-3xl">{title}</h2>
              <p className="mt-2 text-[var(--text-muted)]">This section describes {title.toLowerCase()} for using OpusX responsibly and legally.</p>
            </section>
          ))}
        </div>
        <p className="display-italic mt-14 border-t border-b border-[var(--border)] py-6 text-center text-2xl">— These terms are short because that&apos;s how they should be. —</p>
        <div className="mono mt-6 flex gap-5 text-sm text-[var(--text-muted)]">
          <Link href="/privacy">Privacy</Link>
          <Link href="/">← Home</Link>
        </div>
      </main>
    </>
  );
}
