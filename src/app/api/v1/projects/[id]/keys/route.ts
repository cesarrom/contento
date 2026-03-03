import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { apiKeys, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateApiKey } from "@/lib/apikey";
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
  const keys = await db
    .select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, id))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ data: keys });
}

export async function POST(
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
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const { name, scopes = ["read"], expiresAt } = body as {
    name: string;
    scopes?: string[];
    expiresAt?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { raw, hash, prefix } = generateApiKey();

  const [created] = await db
    .insert(apiKeys)
    .values({
      projectId: id,
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    });

  return NextResponse.json({ data: { ...created, key: raw } }, { status: 201 });
}
