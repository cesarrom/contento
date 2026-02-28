"use client";

import { useState } from "react";
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
import { Trash2, ExternalLink, FileIcon, RefreshCw } from "lucide-react";

type FileRow = {
  key: string;
  size: number;
  lastModified: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileBrowser({
  projectId,
  initialFiles,
  publicBaseUrl,
  isPublic,
}: {
  projectId: string;
  initialFiles: FileRow[];
  publicBaseUrl: string;
  isPublic: boolean;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleDelete(key: string) {
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed");
      setFiles((prev) => prev.filter((f) => f.key !== key));
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files`);
      const json = await res.json();
      if (res.ok) setFiles(json.data);
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{files.length} files</Badge>
          {!isPublic && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              Private — files require auth
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files in this bucket</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key / Path</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.key}>
                <TableCell>
                  <span className="font-mono text-sm">{file.key}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatBytes(file.size)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {file.lastModified
                    ? new Date(file.lastModified).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <a
                      href={`${publicBaseUrl}/${file.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" title="Open file URL">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      disabled={deletingKey === file.key}
                      onClick={() => handleDelete(file.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
