import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthSessionProvider } from "@/components/ui/SessionProvider";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  return (
    <AuthSessionProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:flex-row md:p-8">
        <Sidebar admin />
        <main className="flex-1">{children}</main>
      </div>
      <nav className="card fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 md:hidden">
        <Link href="/admin" className="mono px-3 py-3 text-center text-xs">Overview</Link>
        <Link href="/admin/users" className="mono px-3 py-3 text-center text-xs">Users</Link>
        <Link href="/admin/keys" className="mono px-3 py-3 text-center text-xs">Keys</Link>
        <Link href="/admin/settings" className="mono px-3 py-3 text-center text-xs">Settings</Link>
      </nav>
    </AuthSessionProvider>
  );
}
