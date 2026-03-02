"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  async function handleSignOut() {
    try {
      const cfgRes = await fetch("/api/dev-auth/config");
      if (cfgRes.ok) {
        const cfg = (await cfgRes.json()) as { devAuthEnabled: boolean };
        if (cfg.devAuthEnabled) {
          await fetch("/api/dev-auth/logout", { method: "POST" });
          window.location.href = "/admin/login";
          return;
        }
      }
    } catch {
      // ignore
    }

    await signOut({ callbackUrl: "/admin/login" });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void handleSignOut()}
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
