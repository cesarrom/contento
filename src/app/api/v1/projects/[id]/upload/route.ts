import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";
import { verifySignedUrlToken } from "@/lib/signed-url";
import { putObjectStream } from "@/lib/minio";
import type { ReadableStream as WebReadableStream } from "stream/web";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!path.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allow server-side/admin usage via session or API key.
  const session = await getAdminSession();
  let authorized = Boolean(session);

  if (!authorized) {
    const bearer = extractBearerToken(req);
    if (bearer) {
      const key = await validateApiKey(bearer, "write");
      if (key && key.projectId === id) authorized = true;
    }
  }

  // For frontends, require a signed upload token minted by sign/upload.
  if (!authorized) {
    const payload = await verifySignedUrlToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (payload.m !== "PUT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.k !== "upload") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.pid !== project.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.pslug !== project.slug) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.path !== path) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorized = true;
  }

  if (!req.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? undefined;

  if (token) {
    const payload = await verifySignedUrlToken(token);
    if (payload?.k === "upload") {
      const expectedContentType = payload.q?.contentType;
      if (expectedContentType && expectedContentType !== contentType) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  await putObjectStream(
    project.bucketName,
    path,
    req.body as unknown as WebReadableStream<Uint8Array>,
    contentType
  );

  return NextResponse.json({ data: { uploaded: true, path } }, { status: 201 });
}
