import * as nodePath from "path";
import { getObjectResponse, getObject, putObject } from "@/lib/minio";
import { requireReadAccess, requireSignedToken, unauthorized } from "@/lib/f-proxy";
import { withProjectSlugCors, GENERIC_PROJECT_SLUG_OPTIONS } from "@/lib/project-cors";
import { db } from "@/lib/db/client";
import { transformJobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { transcodeBuffer, transcodeStream, streamToBuffer } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

const MEDIA_FORMATS = new Set(["mp3", "wav", "aac", "ogg", "flac", "m4a"]);

export const OPTIONS = GENERIC_PROJECT_SLUG_OPTIONS;

export const GET = withProjectSlugCors(
  "audio",
  async ({ req, context, project }) => {
    const { projectSlug, path: pathSegments } = await context.params;
    const filePath = pathSegments.join("/");
    const { searchParams } = new URL(req.url);

    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const allowedQueryKeys = ["format"];

    if (project.visibility === "private") {
      
      const okKey = await requireReadAccess(req, project.id);
      
      if (!okKey) {        
        const okToken = await requireSignedToken(req, {
          kind: "audio",
          projectSlug,
          projectId: project.id,
          path: filePath,
          allowedQueryKeys,
        });
        
        
        if (!okToken) {
          return unauthorized();
        }
      }
    } else {
      console.log('[audio] Public project, no auth required');
    }

    const format = searchParams.get("format")?.toLowerCase() ?? "";
    const sourceExt = nodePath.extname(filePath).slice(1).toLowerCase();
    const isSameFormat = format && sourceExt === format;

    if (format && !isSameFormat && MEDIA_FORMATS.has(format)) {
      const outputKey = `_cache/${project.id}/${filePath}__${format}`;

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
        const range = req.headers.get("range") ?? undefined;
        const obj = await getObjectResponse(project.bucketName, cached.outputPath, range);

        const headers = new Headers();
        headers.set("Accept-Ranges", "bytes");
        headers.set("Connection", "keep-alive");
        headers.set("Keep-Alive", "timeout=60, max=1000");
        if (obj.contentType) headers.set("Content-Type", obj.contentType);
        if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
        if (obj.contentRange) headers.set("Content-Range", obj.contentRange);

        if (project.deliveryCacheEnabled) {
          const ttl = Math.max(0, Math.floor(project.deliveryCacheTtlSeconds ?? 0));
          if (ttl > 0) {
            const hasAuthHeader = Boolean(req.headers.get("authorization"));
            headers.set(
              "Cache-Control",
              `${hasAuthHeader ? "private" : "public"}, max-age=${ttl}`
            );
          }
        }

        return new Response(obj.body as unknown as BodyInit, {
          status: range ? 206 : 200,
          headers,
        });
      }

      const mimeMap: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        aac: "audio/aac",
        ogg: "audio/ogg",
        flac: "audio/flac",
        m4a: "audio/mp4",
      };
      const contentType = mimeMap[format] ?? "application/octet-stream";

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
        return Response.json({ error: "Source file not found" }, { status: 404 });
      }

      const inputExt = nodePath.extname(filePath) || `.${format}`;
      const stream = transcodeStream(inputBuffer, inputExt, format);

      const cacheHeaders: Record<string, string> = { "Content-Type": contentType };
      if (project.deliveryCacheEnabled) {
        const ttl = Math.max(0, Math.floor(project.deliveryCacheTtlSeconds ?? 0));
        if (ttl > 0) {
          const hasAuthHeader = Boolean(req.headers.get("authorization"));
          cacheHeaders["Cache-Control"] = `${hasAuthHeader ? "private" : "public"}, max-age=${ttl}`;
        }
      }

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

      return new Response(stream as unknown as BodyInit, {
        status: 200,
        headers: cacheHeaders,
      });
    }

    const range = req.headers.get("range") ?? undefined;
    const obj = await getObjectResponse(project.bucketName, filePath, range);

    const headers = new Headers();
    headers.set("Accept-Ranges", "bytes");
    headers.set("Connection", "keep-alive");
    headers.set("Keep-Alive", "timeout=60, max=1000");
    if (obj.contentType) headers.set("Content-Type", obj.contentType);
    if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
    if (obj.contentRange) headers.set("Content-Range", obj.contentRange);

    return new Response(obj.body as unknown as BodyInit, {
      status: range ? 206 : 200,
      headers,
    });
  }
);
