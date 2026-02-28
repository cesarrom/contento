"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
