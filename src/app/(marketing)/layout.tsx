import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight font-[family-name:var(--font-display)]">
            contento
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link
              href="https://github.com/cesarrom/contento"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/admin/login"
              className="hover:text-foreground transition-colors"
            >
              SSO Login
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Admin UI
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Contento. Self-hosted file management.</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link href="/docs/self-hosting/docker-compose" className="hover:text-foreground transition-colors">
              Self-hosting
            </Link>
            <Link
              href="https://github.com/cesarrom/contento"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
