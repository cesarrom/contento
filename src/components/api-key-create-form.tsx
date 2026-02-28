"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";

const SCOPES = ["read", "write", "admin"] as const;
type Scope = (typeof SCOPES)[number];

export function ApiKeyCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["read"]);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  function toggleScope(scope: Scope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || scopes.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCreatedKey(json.data.key);
      setName("");
      setScopes(["read"]);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    toast.success("API key copied to clipboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create API Key
        </CardTitle>
      </CardHeader>
      <CardContent>
        {createdKey ? (
          <div className="space-y-3">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Copy this key now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-gray-100 px-3 py-2 rounded truncate">
                {createdKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreatedKey(null)}
            >
              Create another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scopes</Label>
              <div className="flex gap-2">
                {SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      scopes.includes(scope)
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" disabled={loading || scopes.length === 0}>
              {loading ? "Creating…" : "Create Key"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
