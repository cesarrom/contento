import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { ensureBucket } from "@/lib/minio";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import { getAdminSession } from "@/lib/admin-auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdmin(req: NextRequest) {
  // Allow session-based admin access
  const session = await getAdminSession();
  if (session) return true;
  // Or API key with admin scope
  const token = extractBearerToken(req);
  if (token) {
    const key = await validateApiKey(token, "admin");
    if (key) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(projects).orderBy(projects.createdAt);
  return NextResponse.json({ data: all });
}

export async function POST(req: NextRequest) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, visibility = "private" } = body as {
    name: string;
    visibility?: "public" | "private";
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = slugify(name);
  const bucketName = `contento-${slug}`;

  await ensureBucket(bucketName, visibility === "public");

  const [project] = await db
    .insert(projects)
    .values({ name: name.trim(), slug, bucketName, visibility })
    .returning();

  return NextResponse.json({ data: project }, { status: 201 });
}
