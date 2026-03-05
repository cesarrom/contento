import { NextResponse } from "next/server";
import {
  isImage,
  isVideo,
  isAudio,
} from "@/lib/imgproxy";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";
import { createSignedUrlToken } from "@/lib/signed-url";
import { withProjectIdCors, GENERIC_PROJECT_ID_OPTIONS } from "@/lib/project-cors";

export interface TransformRequest {
  format?: string;
  width?: number;
  height?: number;
  quality?: number;
  blur?: number;
  fit?: string;
}

export const OPTIONS = GENERIC_PROJECT_ID_OPTIONS

export const POST = withProjectIdCors(
  "api",
  async ({ req, context, project }) => {
    const { id } = await context.params;

    console.log('[sign/read] Processing request for project:', id);

    const session = await getAdminSession();
    if (!session) {
      console.log('[sign/read] No admin session, checking API key');
      const token = extractBearerToken(req);
      if (!token) {
        console.log('[sign/read] No API token found');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const key = await validateApiKey(token, "read");
      if (!key || key.projectId !== id) {
        console.log('[sign/read] Invalid API key or project mismatch');
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log('[sign/read] API key validated successfully');
    } else {
      console.log('[sign/read] Admin session found');
    }

    if (!project) {
      console.log('[sign/read] Project not found');
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    console.log('[sign/read] Request body:', body);
    
    const {
      path,
      expiresIn = 3600,
      kind: requestedKind,
      transform,
    } = body as {
      path: string;
      expiresIn?: number;
      kind?: "raw" | "image" | "audio" | "video";
      transform?: TransformRequest;
    };

    console.log('path', path)

    if (!path?.trim()) {
      console.log('[sign/read] Path is required but not provided');
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const fileKey = path.startsWith("/") ? path.slice(1) : path;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const publicBase = process.env.PUBLIC_URL ?? "http://localhost:3000";

    const kind = requestedKind
      ? requestedKind
      : isImage(fileKey)
        ? "image"
        : isVideo(fileKey)
          ? "video"
          : isAudio(fileKey)
            ? "audio"
            : "raw";

    console.log('[sign/read] Determined file kind:', kind);

    const allowedQuery: Record<string, string> = {};
    if (transform?.format) allowedQuery.format = transform.format;
    if (transform?.width) allowedQuery.w = String(transform.width);
    if (transform?.height) allowedQuery.h = String(transform.height);
    if (transform?.quality) allowedQuery.q = String(transform.quality);
    if (transform?.blur) allowedQuery.blur = String(transform.blur);
    if (transform?.fit) allowedQuery.fit = String(transform.fit);

    console.log('[sign/read] Query parameters:', allowedQuery);

    const token = await createSignedUrlToken({
      method: "GET",
      kind: kind as "raw" | "image" | "audio" | "video",
      projectSlug: project.slug,
      projectId: project.id,
      path: fileKey,
      query: Object.keys(allowedQuery).length ? allowedQuery : undefined,
      expiresIn,
    });

    const qs = new URLSearchParams({ ...allowedQuery, token });
    const url = `${publicBase}/f/${kind}/${project.slug}/${fileKey}?${qs.toString()}`;
    
    console.log('[sign/read] Generated signed URL:', url);

    return NextResponse.json({ data: { url, expiresAt } });
  }
);
