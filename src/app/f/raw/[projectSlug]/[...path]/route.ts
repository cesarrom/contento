import { getObjectResponse } from "@/lib/minio";
import { requireReadAccess, requireSignedToken, unauthorized } from "@/lib/f-proxy";
import { GENERIC_PROJECT_SLUG_OPTIONS, withProjectSlugCors } from "@/lib/project-cors";

export const dynamic = "force-dynamic";

export const GET = withProjectSlugCors<{ projectSlug: string; path: string[] }>(
  "raw",
  async ({ req, context, project }) => {
    const { projectSlug, path: pathSegments } = await context.params;
    const filePath = pathSegments.join("/");

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
);

export const OPTIONS = GENERIC_PROJECT_SLUG_OPTIONS;
