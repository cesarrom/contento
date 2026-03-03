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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileIcon, RefreshCw, Upload, SlidersHorizontal } from "lucide-react";

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

  const [transformOpen, setTransformOpen] = useState(false);
  const [transformKey, setTransformKey] = useState<string | null>(null);
  const [transformKind, setTransformKind] = useState<"image" | "audio" | "video" | "raw">(
    "image"
  );
  const [transformFormat, setTransformFormat] = useState<"" | "webp" | "avif" | "jpg" | "png">("");
  const [audioFormat, setAudioFormat] = useState<"" | "mp3" | "aac" | "ogg" | "flac" | "m4a" | "wav">("");
  const [videoFormat, setVideoFormat] = useState<"" | "mp4" | "webm" | "mov" | "mkv" | "avi">("");
  const [transformWidth, setTransformWidth] = useState("");
  const [transformHeight, setTransformHeight] = useState("");
  const [transformQuality, setTransformQuality] = useState("");
  const [transformBlur, setTransformBlur] = useState("");
  const [transformFit, setTransformFit] = useState<"" | "auto" | "cover" | "contain">("");

  async function handleOpen(key: string) {
    if (isPublic) {
      window.open(`${publicBaseUrl}/${key}`, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const signRes = await fetch(`/api/v1/projects/${projectId}/sign/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/${key}`, kind: "raw" }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error ?? "Failed to sign read URL");

      const signedUrl = signJson.data.url as string;
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  async function handleOpenTransformDialog(key: string) {
    setTransformKey(key);
    setTransformKind("image");
    setTransformFormat("");
    setAudioFormat("");
    setVideoFormat("");
    setTransformWidth("");
    setTransformHeight("");
    setTransformQuality("");
    setTransformBlur("");
    setTransformFit("");
    setTransformOpen(true);
  }

  async function handleOpenTransformed() {
    if (!transformKey) return;

    try {
      const transform: Record<string, unknown> = {};

      if (transformKind === "image") {
        if (transformFormat) transform.format = transformFormat;
        if (transformWidth.trim()) transform.width = Number(transformWidth);
        if (transformHeight.trim()) transform.height = Number(transformHeight);
        if (transformQuality.trim()) transform.quality = Number(transformQuality);
        if (transformBlur.trim()) transform.blur = Number(transformBlur);
        if (transformFit) transform.fit = transformFit;
      }

      if (transformKind === "audio") {
        if (audioFormat) transform.format = audioFormat;
      }

      if (transformKind === "video") {
        if (videoFormat) transform.format = videoFormat;
      }

      const signRes = await fetch(`/api/v1/projects/${projectId}/sign/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/${transformKey}`,
          kind: transformKind,
          transform: Object.keys(transform).length ? transform : undefined,
        }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error ?? "Failed to sign read URL");

      const signedUrl = signJson.data.url as string;
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      setTransformOpen(false);
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
      <Dialog open={transformOpen} onOpenChange={setTransformOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transform & Open</DialogTitle>
            <DialogDescription>
              Generate a signed URL with optional transformation parameters and open it in a new tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kind</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={transformKind === "raw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransformKind("raw")}
                >
                  Raw
                </Button>
                <Button
                  type="button"
                  variant={transformKind === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransformKind("image")}
                >
                  Image
                </Button>
                <Button
                  type="button"
                  variant={transformKind === "audio" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransformKind("audio")}
                >
                  Audio
                </Button>
                <Button
                  type="button"
                  variant={transformKind === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransformKind("video")}
                >
                  Video
                </Button>
              </div>
            </div>

            {transformKind === "image" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={transformFormat === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFormat("")}
                    >
                      Original
                    </Button>
                    <Button
                      type="button"
                      variant={transformFormat === "webp" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFormat("webp")}
                    >
                      WebP
                    </Button>
                    <Button
                      type="button"
                      variant={transformFormat === "avif" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFormat("avif")}
                    >
                      AVIF
                    </Button>
                    <Button
                      type="button"
                      variant={transformFormat === "jpg" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFormat("jpg")}
                    >
                      JPG
                    </Button>
                    <Button
                      type="button"
                      variant={transformFormat === "png" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFormat("png")}
                    >
                      PNG
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fit</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={transformFit === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFit("")}
                    >
                      Default
                    </Button>
                    <Button
                      type="button"
                      variant={transformFit === "auto" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFit("auto")}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant={transformFit === "cover" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFit("cover")}
                    >
                      Cover
                    </Button>
                    <Button
                      type="button"
                      variant={transformFit === "contain" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransformFit("contain")}
                    >
                      Contain
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transform-width">Width</Label>
                  <Input
                    id="transform-width"
                    inputMode="numeric"
                    value={transformWidth}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (/^\d*$/.test(next)) setTransformWidth(next);
                    }}
                    placeholder="e.g. 800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transform-height">Height</Label>
                  <Input
                    id="transform-height"
                    inputMode="numeric"
                    value={transformHeight}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (/^\d*$/.test(next)) setTransformHeight(next);
                    }}
                    placeholder="e.g. 600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transform-quality">Quality</Label>
                  <Input
                    id="transform-quality"
                    inputMode="numeric"
                    value={transformQuality}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (/^\d*$/.test(next)) setTransformQuality(next);
                    }}
                    placeholder="1-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transform-blur">Blur</Label>
                  <Input
                    id="transform-blur"
                    inputMode="numeric"
                    value={transformBlur}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (/^\d*(\.\d*)?$/.test(next)) setTransformBlur(next);
                    }}
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            )}

            {transformKind === "audio" && (
              <div className="space-y-2">
                <Label>Audio format</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={audioFormat === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("")}
                  >
                    Original
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "mp3" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("mp3")}
                  >
                    MP3
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "aac" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("aac")}
                  >
                    AAC
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "ogg" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("ogg")}
                  >
                    OGG
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "flac" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("flac")}
                  >
                    FLAC
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "m4a" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("m4a")}
                  >
                    M4A
                  </Button>
                  <Button
                    type="button"
                    variant={audioFormat === "wav" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioFormat("wav")}
                  >
                    WAV
                  </Button>
                </div>
              </div>
            )}

            {transformKind === "video" && (
              <div className="space-y-2">
                <Label>Video format</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={videoFormat === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("")}
                  >
                    Original
                  </Button>
                  <Button
                    type="button"
                    variant={videoFormat === "mp4" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("mp4")}
                  >
                    MP4
                  </Button>
                  <Button
                    type="button"
                    variant={videoFormat === "webm" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("webm")}
                  >
                    WebM
                  </Button>
                  <Button
                    type="button"
                    variant={videoFormat === "mov" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("mov")}
                  >
                    MOV
                  </Button>
                  <Button
                    type="button"
                    variant={videoFormat === "mkv" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("mkv")}
                  >
                    MKV
                  </Button>
                  <Button
                    type="button"
                    variant={videoFormat === "avi" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVideoFormat("avi")}
                  >
                    AVI
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransformOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleOpenTransformed()}>Open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      title="Transform & open"
                      onClick={() => void handleOpenTransformDialog(file.key)}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
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
