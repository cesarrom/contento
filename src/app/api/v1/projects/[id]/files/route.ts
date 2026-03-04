import { NextRequest, NextResponse } from "next/server";
import { listObjects, deleteObject } from "@/lib/minio";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";
import { withProjectIdCors, GENERIC_PROJECT_ID_OPTIONS } from "@/lib/project-cors";

export const OPTIONS = GENERIC_PROJECT_ID_OPTIONS;

async function requireWriteAccess(req: NextRequest, projectId: string) {
  const session = await getAdminSession();
  if (session) return true;
  const token = extractBearerToken(req);
  if (token) {
    const key = await validateApiKey(token, "write");
    if (key && key.projectId === projectId) return true;
  }
  return false;
}

async function requireReadAccess(req: NextRequest, projectId: string) {
  const session = await getAdminSession();
  if (session) return true;
  const token = extractBearerToken(req);
  if (token) {
    const key = await validateApiKey(token, "read");
    if (key && key.projectId === projectId) return true;
  }
  return false;
}

export const GET = withProjectIdCors(
  "api",
  async ({ req, context, project }) => {
    const { id } = await context.params;

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allowed = await requireReadAccess(req, id);
    if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") ?? undefined;

    const objects = await listObjects(project.bucketName, prefix);
    const data = objects.map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    return NextResponse.json({ data });
  }
);

export const DELETE = withProjectIdCors(
  "api",
  async ({ req, context, project }) => {
    const { id } = await context.params;

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allowed = await requireWriteAccess(req, id);
    if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { key } = body as { key: string };
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

    await deleteObject(project.bucketName, key);
    return NextResponse.json({ data: { deleted: true } });
  }
);
