"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date | null;
};

export function ApiKeyList({
  projectId,
  initialKeys,
}: {
  projectId: string;
  initialKeys: KeyRow[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(keyId: string) {
    setDeletingId(keyId);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/keys/${keyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("API key deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete key");
    } finally {
      setDeletingId(null);
    }
  }

  if (initialKeys.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No API keys yet. Create one above.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Existing Keys</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell>
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {key.keyPrefix}…
                </code>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {key.scopes.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {key.expiresAt
                  ? new Date(key.expiresAt).toLocaleDateString()
                  : "Never"}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {key.createdAt
                  ? new Date(key.createdAt).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  disabled={deletingId === key.id}
                  onClick={() => handleDelete(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
