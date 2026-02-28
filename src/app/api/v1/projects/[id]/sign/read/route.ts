import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { presignDownload } from "@/lib/minio";
import {
  buildImgproxyUrl,
  isImage,
  isVideo,
  isAudio,
  ImgproxyOptions,
} from "@/lib/imgproxy";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { auth } from "@/lib/auth";

export interface TransformRequest {
  format?: string;
  width?: number;
  height?: number;
  quality?: number;
  blur?: number;
  fit?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session) {
    const token = extractBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const key = await validateApiKey(token, "read");
    if (!key || key.projectId !== id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    path,
    expiresIn = 3600,
    transform,
  } = body as {
    path: string;
    expiresIn?: number;
    transform?: TransformRequest;
  };

  if (!path?.trim()) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const fileKey = path.startsWith("/") ? path.slice(1) : path;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const publicBase = process.env.PUBLIC_URL ?? "http://localhost:3000";

  // ── Image: build a signed imgproxy URL ───────────────────────────────────────
  if (transform && isImage(fileKey)) {
    const imgOpts: ImgproxyOptions = {
      format: transform.format,
      width: transform.width,
      height: transform.height,
      quality: transform.quality,
      blur: transform.blur,
      resizingType: transform.fit as ImgproxyOptions["resizingType"],
    };
    const source = `s3://${project.bucketName}/${fileKey}`;
    const url = buildImgproxyUrl(source, imgOpts);
    return NextResponse.json({ data: { url, expiresAt } });
  }

  // ── Video / Audio: return the /f/ delivery URL with ?format= query param ─────
  // The delivery route handles on-demand transcoding and caching.
  if (transform?.format && (isVideo(fileKey) || isAudio(fileKey))) {
    const params = new URLSearchParams({ format: transform.format });
    const url = `${publicBase}/f/${project.slug}/${fileKey}?${params.toString()}`;
    return NextResponse.json({ data: { url, expiresAt } });
  }

  // ── Raw presigned download URL (no transform) ────────────────────────────────
  const url = await presignDownload(project.bucketName, fileKey, expiresIn);
  return NextResponse.json({ data: { url, expiresAt } });
}
