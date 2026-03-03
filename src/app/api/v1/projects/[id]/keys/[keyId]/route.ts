import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const allowed = await requireAdmin(req);
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, keyId } = await params;
  const [deleted] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: deleted });
}
