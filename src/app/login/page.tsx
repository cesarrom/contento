"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DevAuthConfig = {
  devAuthEnabled: boolean;
  authentikConfigured: boolean;
  providerName: string | null;
};

export default function LoginPage() {
  const [config, setConfig] = useState<DevAuthConfig | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/dev-auth/config")
      .then((r) => r.json())
      .then((data: DevAuthConfig) => setConfig(data))
      .catch(() => setConfig({ devAuthEnabled: false, authentikConfigured: false, providerName: null }));
  }, []);

  async function handleDevLogin() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/dev-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Invalid credentials");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-[family-name:var(--font-display)]">Contento</CardTitle>
          <CardDescription>Sign in to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          {config?.authentikConfigured ? (
            <Button className="w-full" onClick={() => signIn("oidc", { callbackUrl: "/admin" })}>
              Sign in with {config.providerName || "SSO"}
            </Button>
          ) : config?.devAuthEnabled ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button className="w-full" onClick={handleDevLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Authentication is not configured. Set OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET environment variables.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
