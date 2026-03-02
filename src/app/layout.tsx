import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const fontDisplay = Fraunces({ subsets: ["latin"], variable: "--font-display" });

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
      <body className={`antialiased ${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <RootProvider>{children}</RootProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
