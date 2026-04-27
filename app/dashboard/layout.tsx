import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthSessionProvider } from "@/components/ui/SessionProvider";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  return (
    <AuthSessionProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:flex-row md:p-8">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
      <nav className="card fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 md:hidden">
        <Link href="/dashboard" className="mono px-3 py-3 text-center text-xs">Overview</Link>
        <Link href="/dashboard/keys" className="mono px-3 py-3 text-center text-xs">Keys</Link>
        <Link href="/dashboard/usage" className="mono px-3 py-3 text-center text-xs">Usage</Link>
        <Link href="/docs" className="mono px-3 py-3 text-center text-xs">Docs</Link>
      </nav>
    </AuthSessionProvider>
  );
}
