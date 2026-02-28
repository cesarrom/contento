import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects, transformJobs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { presignDownload, publicUrl } from "@/lib/minio";
import {
  buildImgproxyUrl,
  isImage,
  isVideo,
  isAudio,
  ImgproxyOptions,
} from "@/lib/imgproxy";
import { getTransformQueue, TransformJobData } from "@/lib/queue";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";

function parseTransformParams(searchParams: URLSearchParams): ImgproxyOptions {
  const opts: ImgproxyOptions = {};
  const format = searchParams.get("format");
  if (format) opts.format = format;
  const w = searchParams.get("w");
  if (w) opts.width = parseInt(w, 10);
  const h = searchParams.get("h");
  if (h) opts.height = parseInt(h, 10);
  const q = searchParams.get("q");
  if (q) opts.quality = parseInt(q, 10);
  const blur = searchParams.get("blur");
  if (blur) opts.blur = parseFloat(blur);
  const fit = searchParams.get("fit");
  if (fit) opts.resizingType = fit as ImgproxyOptions["resizingType"];
  return opts;
}

const MEDIA_FORMATS = new Set(["mp4", "mov", "webm", "mp3", "wav", "aac", "ogg", "flac"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; path: string[] }> }
) {
  const { projectSlug, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");
  const { searchParams } = new URL(req.url);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Auth check for private projects
  if (project.visibility === "private") {
    const token = extractBearerToken(req);
    if (!token) {
      // Check for signed URL token param
      const signedToken = searchParams.get("token");
      if (!signedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const key = await validateApiKey(token, "read");
      if (!key || key.projectId !== project.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const format = searchParams.get("format");
  const hasTransform =
    format || searchParams.get("w") || searchParams.get("h") || searchParams.get("q");

  // ── Image transformation via imgproxy ───────────────────────────────────────
  if (hasTransform && isImage(filePath)) {
    const opts = parseTransformParams(searchParams);
    const source = `s3://${project.bucketName}/${filePath}`;
    const imgproxyUrl = buildImgproxyUrl(source, opts);
    return NextResponse.redirect(imgproxyUrl, 302);
  }

  // ── Video/Audio transformation via FFmpeg worker ────────────────────────────
  if (format && (isVideo(filePath) || isAudio(filePath)) && MEDIA_FORMATS.has(format)) {
    const cacheKey = `${filePath}__${format}`;
    const outputPath = `_cache/${cacheKey}`;

    // Check if already processed
    const [existing] = await db
      .select()
      .from(transformJobs)
      .where(
        and(
          eq(transformJobs.projectId, project.id),
          eq(transformJobs.sourcePath, filePath),
          eq(transformJobs.status, "done")
        )
      )
      .limit(1);

    if (existing?.outputPath) {
      const url = await presignDownload(project.bucketName, existing.outputPath, 3600);
      return NextResponse.redirect(url, 302);
    }

    // Check if pending/processing
    const [pending] = await db
      .select()
      .from(transformJobs)
      .where(
        and(
          eq(transformJobs.projectId, project.id),
          eq(transformJobs.sourcePath, filePath),
          eq(transformJobs.status, "processing")
        )
      )
      .limit(1);

    if (pending) {
      return NextResponse.json(
        { status: "processing", message: "Transformation in progress", jobId: pending.id },
        { status: 202 }
      );
    }

    // Enqueue new job
    const [job] = await db
      .insert(transformJobs)
      .values({
        projectId: project.id,
        sourcePath: filePath,
        params: { format },
        status: "pending",
        outputPath,
      })
      .returning();

    const jobData: TransformJobData = {
      jobId: job.id,
      projectId: project.id,
      bucketName: project.bucketName,
      sourcePath: filePath,
      outputPath,
      params: { format },
    };

    await getTransformQueue().add("transform", jobData);

    return NextResponse.json(
      { status: "pending", message: "Transformation queued", jobId: job.id },
      { status: 202 }
    );
  }

  // ── Raw file delivery ───────────────────────────────────────────────────────
  if (project.visibility === "public") {
    const url = publicUrl(project.bucketName, filePath);
    return NextResponse.redirect(url, 302);
  }

  const url = await presignDownload(project.bucketName, filePath, 3600);
  return NextResponse.redirect(url, 302);
}
