import { createHash } from "crypto";
import { randomBytes } from "crypto";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { NextRequest } from "next/server";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `ctk_${randomBytes(32).toString("hex")}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type KeyScope = "read" | "write" | "admin";

export interface ValidatedKey {
  keyId: string;
  projectId: string;
  scopes: string[];
}

export async function validateApiKey(
  raw: string,
  requiredScope: KeyScope = "read"
): Promise<ValidatedKey | null> {
  const hash = hashKey(raw);
  const now = new Date();

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now))
      )
    )
    .limit(1);

  if (!key) return null;

  const scopes = key.scopes ?? [];
  if (requiredScope === "read" && !scopes.includes("read") && !scopes.includes("write") && !scopes.includes("admin")) return null;
  if (requiredScope === "write" && !scopes.includes("write") && !scopes.includes("admin")) return null;
  if (requiredScope === "admin" && !scopes.includes("admin")) return null;

  return { keyId: key.id, projectId: key.projectId, scopes };
}

export function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}
