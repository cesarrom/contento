import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setBucketPublic, setBucketPrivate } from "@/lib/minio";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";

async function requireAdmin(req: NextRequest) {
  const session = await getAdminSession();
  if (session) return true;
  const token = extractBearerToken(req);
  if (token) {
    const key = await validateApiKey(token, "admin");
    if (key) return true;
  }
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: project });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, visibility, deliveryCacheEnabled, deliveryCacheTtlSeconds } = body as {
    name?: string;
    visibility?: "public" | "private";
    deliveryCacheEnabled?: boolean;
    deliveryCacheTtlSeconds?: number;
  };

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Partial<typeof existing> = {};
  if (name) updates.name = name.trim();
  if (visibility) {
    updates.visibility = visibility;
    if (visibility === "public") {
      await setBucketPublic(existing.bucketName);
    } else {
      await setBucketPrivate(existing.bucketName);
    }
  }

  if (typeof deliveryCacheEnabled === "boolean") {
    updates.deliveryCacheEnabled = deliveryCacheEnabled;
  }
  if (typeof deliveryCacheTtlSeconds === "number") {
    const ttl = Math.max(0, Math.floor(deliveryCacheTtlSeconds));
    updates.deliveryCacheTtlSeconds = ttl;
  }

  const [updated] = await db
    .update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: deleted });
}
