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


    const session = await getAdminSession();
    if (!session) {
      const token = extractBearerToken(req);
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const key = await validateApiKey(token, "read");
      if (!key || key.projectId !== id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
    }

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    
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


    if (!path?.trim()) {
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


    const allowedQuery: Record<string, string> = {};
    if (transform?.format) allowedQuery.format = transform.format;
    if (transform?.width) allowedQuery.w = String(transform.width);
    if (transform?.height) allowedQuery.h = String(transform.height);
    if (transform?.quality) allowedQuery.q = String(transform.quality);
    if (transform?.blur) allowedQuery.blur = String(transform.blur);
    if (transform?.fit) allowedQuery.fit = String(transform.fit);


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
    
    return NextResponse.json({ data: { url, expiresAt } });
  }
);
