import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/sign-out-button";
import { FolderOpen, LayoutDashboard } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r flex-col">
        <div className="p-5 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-lg">Contento</span>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Projects
          </Link>
        </nav>
        <Separator />
        <div className="p-4 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{session.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="md:hidden bg-white border-b">
          <div className="h-14 px-4 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Contento</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Projects
              </Link>
              <SignOutButton />
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-xs text-gray-500 truncate">{session.email}</p>
          </div>
        </header>
        <div className="overflow-auto">{children}</div>
      </main>
    </div>
  );
}
