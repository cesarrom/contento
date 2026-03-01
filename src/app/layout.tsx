import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contento",
  description: "Self-hosted file management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <RootProvider>{children}</RootProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
