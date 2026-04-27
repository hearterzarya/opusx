"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <form className="card w-full max-w-md space-y-5 p-6 md:p-8" onSubmit={submit}>
        <p className="display-italic text-3xl">OpusX</p>
        <h1 className="display-italic text-4xl">Sign in</h1>
        <input className="mono w-full border border-[var(--border)] bg-[var(--surface)] p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="mono w-full border border-[var(--border)] bg-[var(--surface)] p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit" disabled={loading} className="mono w-full border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)]">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mono text-xs text-[var(--error)]">{error}</p>
        <Link href="/auth/register" className="mono text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Don&apos;t have an account? Register →</Link>
      </form>
    </main>
  );
}
