import { NextRequest } from "next/server";
import { getObjectResponse } from "@/lib/minio";
import { resolveProjectBySlug, requireReadAccess, requireSignedToken, unauthorized } from "@/lib/f-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; path: string[] }> }
) {
  const { projectSlug, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  const project = await resolveProjectBySlug(projectSlug);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  if (project.visibility === "private") {
    const okKey = await requireReadAccess(req, project.id);
    if (!okKey) {
      const okToken = await requireSignedToken(req, {
        kind: "raw",
        projectSlug,
        projectId: project.id,
        path: filePath,
        allowedQueryKeys: [],
      });
      if (!okToken) return unauthorized();
    }
  }

  const range = req.headers.get("range") ?? undefined;
  const obj = await getObjectResponse(project.bucketName, filePath, range);

  const headers = new Headers();
  headers.set("Accept-Ranges", "bytes");
  if (obj.contentType) headers.set("Content-Type", obj.contentType);
  if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
  if (obj.contentRange) headers.set("Content-Range", obj.contentRange);

  return new Response(obj.body as unknown as BodyInit, {
    status: range ? 206 : 200,
    headers,
  });
}
