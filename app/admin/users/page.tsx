"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  keysCount: number;
  tokensUsed: number;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");

  const load = async () => {
    void fetch("/api/admin/users")
      .then((response) => response.json())
      .then((data: UserRow[]) => setRows(data));
  };

  useEffect(() => {
    void fetch("/api/admin/users")
      .then((response) => response.json())
      .then((data: UserRow[]) => setRows(data));
  }, []);

  const addUser = async () => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setName("");
    setEmail("");
    setPassword("");
    setRole("USER");
    void load();
  };

  const changeRole = async (id: string, nextRole: string) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    void load();
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="space-y-8">
      <h1 className="display-italic text-4xl">Users</h1>
      <div className="card p-4 mono text-xs">
        <p className="mb-2">+ Add User</p>
        <div className="grid gap-2 md:grid-cols-5">
          <input className="border border-[var(--border)] bg-[var(--surface-2)] p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border border-[var(--border)] bg-[var(--surface-2)] p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border border-[var(--border)] bg-[var(--surface-2)] p-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="border border-[var(--border)] bg-[var(--surface-2)] p-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">USER</option><option value="RESELLER">RESELLER</option>
          </select>
          <button type="button" className="border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-2)]" onClick={addUser}>Add User</button>
        </div>
      </div>
      <div className="card overflow-auto p-4">
        <table className="mono w-full border-collapse text-xs">
          <thead><tr className="border-b border-[var(--border)]"><th className="py-3 text-left">Name</th><th className="py-3 text-left">Email</th><th className="py-3 text-left">Role</th><th className="py-3 text-left">Keys</th><th className="py-3 text-left">Tokens</th><th className="py-3 text-left">Actions</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[var(--border)] text-[var(--text-muted)]"><td className="py-3">{row.name}</td><td>{row.email}</td><td>{row.role}</td><td>{row.keysCount}</td><td>{row.tokensUsed}</td><td><div className="flex gap-1"><button type="button" className="border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]" onClick={() => changeRole(row.id, row.role === "USER" ? "RESELLER" : "USER")}>Change Role</button><button type="button" className="border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]" onClick={() => deleteUser(row.id)}>Delete</button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
