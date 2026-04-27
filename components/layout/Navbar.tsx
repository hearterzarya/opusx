"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/docs", label: "Docs" },
    { href: "/key-status", label: "Check Usage" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--text)]">
          <span className="logo-chip">✓</span>
          <span className="display-italic text-xl">OpusX</span>
        </Link>
        <nav className="mono flex items-center gap-3 text-sm text-[var(--text-muted)]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href
                ? "rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[var(--text)]"
                : "rounded-md border border-transparent px-3 py-1 hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text)]"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
