import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { presignDownload } from "@/lib/minio";
import { buildImgproxyUrl, isImage, ImgproxyOptions } from "@/lib/imgproxy";
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
    const key = await validateApiKey(token, "read");
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
    expiresIn = 3600,
    transform,
  } = body as {
    path: string;
    expiresIn?: number;
    transform?: ImgproxyOptions;
  };

  if (!path?.trim()) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const key = path.startsWith("/") ? path.slice(1) : path;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  if (transform && isImage(key)) {
    // Build imgproxy signed URL with transformation options
    const source = `s3://${project.bucketName}/${key}`;
    const url = buildImgproxyUrl(source, transform);
    return NextResponse.json({ data: { url, expiresAt } });
  }

  // Raw presigned download URL
  const url = await presignDownload(project.bucketName, key, expiresIn);
  return NextResponse.json({ data: { url, expiresAt } });
}
