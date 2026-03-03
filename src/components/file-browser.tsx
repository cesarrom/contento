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
import { Trash2, ExternalLink, FileIcon, RefreshCw, Upload } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [uploadKey, setUploadKey] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function handleOpen(key: string) {
    if (isPublic) {
      window.open(`${publicBaseUrl}/${key}`, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const signRes = await fetch(`/api/v1/projects/${projectId}/sign/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/${key}` }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error ?? "Failed to sign read URL");

      const signedUrl = signJson.data.url as string;
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    }
  }

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

  async function handleUpload() {
    if (!uploadFile) return;

    const key = (uploadKey || uploadFile.name).trim().replace(/^\/+/, "");
    if (!key) return;

    setUploading(true);
    try {
      const signRes = await fetch(`/api/v1/projects/${projectId}/sign/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/${key}`,
          contentType: uploadFile.type || "application/octet-stream",
        }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error ?? "Failed to sign upload");

      const putUrl = signJson.data.url as string;
      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": uploadFile.type || "application/octet-stream",
        },
        body: uploadFile,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      toast.success("File uploaded");
      setUploadKey("");
      setUploadFile(null);
      await handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{files.length} files</Badge>
          {!isPublic && (
            <Badge variant="outline" className="text-xs text-accent-foreground border-border">
              Private — files require auth
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
        <input
          type="file"
          className="text-sm"
          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
        />
        <input
          type="text"
          className="flex-1 border border-input bg-background rounded-md px-3 py-2 text-sm"
          placeholder="Key / Path (optional; defaults to filename)"
          value={uploadKey}
          onChange={(e) => setUploadKey(e.target.value)}
        />
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !uploadFile}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
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
                <TableCell className="text-sm text-muted-foreground">
                  {formatBytes(file.size)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {file.lastModified
                    ? new Date(file.lastModified).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={isPublic ? "Open file URL" : "Open signed URL"}
                      onClick={() => void handleOpen(file.key)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
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
