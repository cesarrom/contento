import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { presignUpload } from "@/lib/minio";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session) {
    const token = extractBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const key = await validateApiKey(token, "write");
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
    contentType = "application/octet-stream",
    expiresIn = 3600,
  } = body as { path: string; contentType?: string; expiresIn?: number };

  if (!path?.trim()) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const key = path.startsWith("/") ? path.slice(1) : path;
  const url = await presignUpload(project.bucketName, key, contentType, expiresIn);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return NextResponse.json({ data: { url, method: "PUT", expiresAt } });
}
