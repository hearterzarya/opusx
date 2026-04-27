"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
      setLoading(false);
      toast.error("Registration failed");
      return;
    }
    const signInResult = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInResult?.error) {
      toast.success("Account created");
      router.push("/auth/login");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <form className="card w-full max-w-md space-y-5 p-6 md:p-8" onSubmit={submit}>
        <h1 className="display-italic text-4xl">Create account</h1>
        <input className="mono w-full border border-[var(--border)] bg-[var(--surface)] p-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="mono w-full border border-[var(--border)] bg-[var(--surface)] p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="mono w-full border border-[var(--border)] bg-[var(--surface)] p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit" disabled={loading} className="mono w-full border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)]">
          {loading ? "Creating..." : "Create account"}
        </button>
        <Link href="/auth/login" className="mono text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Already have an account? Sign in →</Link>
      </form>
    </main>
  );
}
