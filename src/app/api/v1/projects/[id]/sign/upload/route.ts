import { NextResponse } from "next/server";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";
import { createSignedUrlToken } from "@/lib/signed-url";
import { withProjectIdCors, GENERIC_PROJECT_ID_OPTIONS } from "@/lib/project-cors";

export const OPTIONS = GENERIC_PROJECT_ID_OPTIONS

export const POST = withProjectIdCors(
  "api",
  async ({ req, context, project }) => {
    const { id } = await context.params;

    const session = await getAdminSession();
    if (!session) {
      const token = extractBearerToken(req);
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const key = await validateApiKey(token, "write");
      if (!key || key.projectId !== id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    path,
    contentType = "application/octet-stream",
    expiresIn = 3600,
  } = body as { path: string; contentType?: string; expiresIn?: number };

  if (!path?.trim()) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const key = path.startsWith("/") ? path.slice(1) : path;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const publicBase = process.env.PUBLIC_URL ?? "http://localhost:3000";
  const token = await createSignedUrlToken({
    method: "PUT",
    kind: "upload",
    projectSlug: project.slug,
    projectId: project.id,
    path: key,
    query: { contentType },
    expiresIn,
  });

  const qs = new URLSearchParams({ path: key, token });
  const url = `${publicBase}/api/v1/projects/${project.id}/upload?${qs.toString()}`;

  return NextResponse.json({ data: { url, method: "PUT", expiresAt } });
  }
);
