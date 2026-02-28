import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import { db } from "@/lib/db/client";
import { projects, transformJobs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getObject, putObject, presignDownload, publicUrl } from "@/lib/minio";
import {
  buildImgproxyUrl,
  isImage,
  isVideo,
  isAudio,
  ImgproxyOptions,
} from "@/lib/imgproxy";
import { transcodeBuffer, transcodeStream, streamToBuffer } from "@/lib/ffmpeg";
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

const MEDIA_FORMATS = new Set([
  // video
  "mp4", "mov", "webm", "mkv", "avi",
  // audio
  "mp3", "wav", "aac", "ogg", "flac", "m4a",
]);

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
    format ||
    searchParams.get("w") ||
    searchParams.get("h") ||
    searchParams.get("q") ||
    searchParams.get("blur") ||
    searchParams.get("fit");

  // ── Image transformation via imgproxy ───────────────────────────────────────
  // Also handles video thumbnail extraction when ?format=<image> is requested.
  const formatIsImage = format ? isImage(`_.${format}`) : false;
  if (hasTransform && (isImage(filePath) || (format && formatIsImage && isVideo(filePath)))) {
    const opts = parseTransformParams(searchParams);
    const source = `s3://${project.bucketName}/${filePath}`;
    const imgproxyUrl = buildImgproxyUrl(source, opts);
    return NextResponse.redirect(imgproxyUrl, 302);
  }

  // ── Video/Audio transformation via inline FFmpeg ──────────────────────────────
  const sourceExt = path.extname(filePath).slice(1).toLowerCase();
  const isSameFormat = sourceExt === format;
  if (format && !isSameFormat && (isVideo(filePath) || isAudio(filePath)) && MEDIA_FORMATS.has(format)) {
    // Include projectId in cache key to avoid cross-project collisions
    const outputKey = `_cache/${project.id}/${filePath}__${format}`;

    // Return cached result if it already exists in MinIO
    const [cached] = await db
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

    if (cached?.outputPath) {
      const url = await presignDownload(project.bucketName, cached.outputPath, 3600);
      return NextResponse.redirect(url, 302);
    }

    const mimeMap: Record<string, string> = {
      mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska",
      avi: "video/x-msvideo", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac",
      ogg: "audio/ogg", flac: "audio/flac", m4a: "audio/mp4",
    };
    const contentType = mimeMap[format] ?? "application/octet-stream";

    // Record job start
    const [job] = await db
      .insert(transformJobs)
      .values({
        projectId: project.id,
        sourcePath: filePath,
        params: { format },
        status: "processing",
        outputPath: outputKey,
      })
      .returning();

    let inputBuffer: Buffer;
    try {
      const sourceStream = await getObject(project.bucketName, filePath);
      inputBuffer = await streamToBuffer(sourceStream as import("stream").Readable);
    } catch (err) {
      await db.update(transformJobs).set({ status: "failed" }).where(eq(transformJobs.id, job.id));
      console.error("[ffmpeg] failed to fetch source:", err);
      return NextResponse.json({ error: "Source file not found" }, { status: 404 });
    }

    const inputExt = path.extname(filePath) || `.${format}`;

    // Stream FFmpeg output directly to the browser as it's produced.
    // The browser's <audio>/<video> element starts receiving data immediately.
    const stream = transcodeStream(inputBuffer, inputExt, format);

    // After the stream is consumed, cache the result in MinIO in the background
    // so subsequent requests get an instant presigned redirect.
    void (async () => {
      try {
        const outputBuffer = await transcodeBuffer(inputBuffer, inputExt, format);
        await putObject(project.bucketName, outputKey, outputBuffer);
        await db.update(transformJobs).set({ status: "done" }).where(eq(transformJobs.id, job.id));
      } catch (err) {
        await db.update(transformJobs).set({ status: "failed" }).where(eq(transformJobs.id, job.id));
        console.error("[ffmpeg] background cache failed:", err);
      }
    })();

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  }

  // ── Raw file delivery ───────────────────────────────────────────────────────
  if (project.visibility === "public") {
    const url = publicUrl(project.bucketName, filePath);
    return NextResponse.redirect(url, 302);
  }

  const url = await presignDownload(project.bucketName, filePath, 3600);
  return NextResponse.redirect(url, 302);
}
