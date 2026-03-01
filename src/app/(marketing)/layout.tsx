import Link from "next/link";
import { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            contento
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Docs
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Admin UI
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} Contento. Self-hosted file management.</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Documentation
            </Link>
            <Link href="/docs/self-hosting/docker-compose" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Self-hosting
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
