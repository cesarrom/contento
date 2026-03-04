import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, validateApiKey } from "@/lib/apikey";
import {
  matchesQuerySubset,
  tokenQuerySubset,
  verifySignedUrlToken,
} from "@/lib/signed-url";

export type FKind = "raw" | "image" | "audio" | "video";

export async function requireReadAccess(
  req: NextRequest,
  projectId: string
): Promise<boolean> {
  const token = extractBearerToken(req);
  if (!token) return false;
  const key = await validateApiKey(token, "read");
  return Boolean(key && key.projectId === projectId);
}

export async function requireSignedToken(
  req: NextRequest,
  input: {
    kind: FKind;
    projectSlug: string;
    projectId: string;
    path: string;
    allowedQueryKeys: string[];
  }
): Promise<boolean> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return false;

  const payload = await verifySignedUrlToken(token);
  if (!payload) return false;

  if (payload.m !== "GET") return false;
  if (payload.k !== input.kind) return false;
  if (payload.pslug !== input.projectSlug) return false;
  if (payload.pid !== input.projectId) return false;
  if (payload.path !== input.path) return false;

  const expected = payload.q;
  if (!matchesQuerySubset(searchParams, expected)) return false;

  const actualSubset = tokenQuerySubset(searchParams, input.allowedQueryKeys);
  for (const [k, v] of Object.entries(actualSubset)) {
    if (expected?.[k] !== v) return false;
  }

  return true;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
