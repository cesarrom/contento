"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/db/schema";
import { normalizeOrigin } from "@/lib/origins";

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [visibility, setVisibility] = useState<"public" | "private">(
    project.visibility as "public" | "private"
  );
  const [deliveryCacheEnabled, setDeliveryCacheEnabled] = useState(
    Boolean(project.deliveryCacheEnabled)
  );
  const [deliveryCacheTtlSeconds, setDeliveryCacheTtlSeconds] = useState(
    String(project.deliveryCacheTtlSeconds ?? 300)
  );
  const [allowedOriginsText, setAllowedOriginsText] = useState(
    (project.allowedOrigins ?? []).join("\n")
  );
  const [originError, setOriginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate origins before submitting
    const originLines = allowedOriginsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const validOrigins: string[] = [];
    for (const line of originLines) {
      const normalized = normalizeOrigin(line);
      if (!normalized) {
        setOriginError(`Invalid origin: "${line}". Use format: https://example.com`);
        return;
      }
      validOrigins.push(normalized);
    }
    setOriginError(null);

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          visibility,
          deliveryCacheEnabled,
          deliveryCacheTtlSeconds: Number.parseInt(deliveryCacheTtlSeconds || "0", 10),
          allowedOrigins: validOrigins,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Settings saved");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["private", "public"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    visibility === v
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {v === "public" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Delivery cache</Label>
            <div className="grid grid-cols-2 gap-3">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setDeliveryCacheEnabled(v)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    deliveryCacheEnabled === v
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="capitalize">{v ? "Enabled" : "Disabled"}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Controls Cache-Control headers for transformed delivery URLs.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryCacheTtl">Delivery cache TTL (seconds)</Label>
            <Input
              id="deliveryCacheTtl"
              inputMode="numeric"
              value={deliveryCacheTtlSeconds}
              onChange={(e) => {
                const next = e.target.value;
                if (/^\d*$/.test(next)) setDeliveryCacheTtlSeconds(next);
              }}
              placeholder="300"
              disabled={!deliveryCacheEnabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allowedOrigins">Allowed CORS Origins</Label>
            <Textarea
              id="allowedOrigins"
              value={allowedOriginsText}
              onChange={(e) => {
                setAllowedOriginsText(e.target.value);
                setOriginError(null);
              }}
              placeholder="https://app.example.com\nhttps://admin.example.com"
              rows={3}
              className={originError ? "border-destructive" : ""}
            />
            {originError && (
              <p className="text-xs text-destructive">{originError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              One origin per line. Each must be a full URL including protocol (https://). Leave empty to allow all origins from same host.
            </p>
            {project.allowedOrigins && project.allowedOrigins.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {project.allowedOrigins.map((origin) => (
                  <span
                    key={origin}
                    className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded font-mono"
                  >
                    {origin}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
