"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/keys", label: "API Keys" },
  { href: "/dashboard/usage", label: "Usage" },
  { href: "/docs", label: "Docs" },
];

export function Sidebar({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <aside className="card hidden w-60 shrink-0 flex-col gap-6 p-4 md:flex md:p-6">
      <div>
        <p className="display-italic text-3xl not-italic">OpusX</p>
        <p className="mono text-xs text-[var(--text-muted)]">Control Plane</p>
      </div>
      <nav className="mono flex flex-col gap-1 text-sm">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 transition hover:bg-[var(--surface-2)] ${pathname === item.href ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}
          >
            {item.label}
          </Link>
        ))}
        {admin && (
          <>
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">Admin</p>
            <Link href="/admin" className={`px-3 py-2 transition hover:bg-[var(--surface-2)] ${pathname === "/admin" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
              Admin Overview
            </Link>
            <Link href="/admin/users" className={`px-3 py-2 transition hover:bg-[var(--surface-2)] ${pathname === "/admin/users" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
              Admin Users
            </Link>
            <Link href="/admin/keys" className={`px-3 py-2 transition hover:bg-[var(--surface-2)] ${pathname === "/admin/keys" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
              Admin Keys
            </Link>
            <Link href="/admin/settings" className={`px-3 py-2 transition hover:bg-[var(--surface-2)] ${pathname === "/admin/settings" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
              Admin Settings
            </Link>
          </>
        )}
      </nav>
      <div className="mono mt-auto text-xs text-[var(--text-muted)]">
        <p>{data?.user?.email}</p>
        <button type="button" className="mt-3 border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-2)]" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
          Logout
        </button>
      </div>
    </aside>
  );
}
