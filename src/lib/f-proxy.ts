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
  if (!token) {
    console.log('[f-proxy] No bearer token found in request');
    return false;
  }
  
  const key = await validateApiKey(token, "read");
  const isValid = Boolean(key && key.projectId === projectId);
  
  if (!isValid) {
    console.log('[f-proxy] API key validation failed:', {
      hasToken: !!token,
      keyFound: !!key,
      keyProjectId: key?.projectId,
      requiredProjectId: projectId,
      keyScopes: key?.scopes
    });
  }
  
  return isValid;
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
  if (!token) {
    console.log('[f-proxy] No signed token found in query params');
    return false;
  }

  const payload = await verifySignedUrlToken(token);
  if (!payload) {
    console.log('[f-proxy] Signed token verification failed');
    return false;
  }

  if (payload.m !== "GET") {
    console.log('[f-proxy] Token method mismatch:', { expected: "GET", actual: payload.m });
    return false;
  }
  if (payload.k !== input.kind) {
    console.log('[f-proxy] Token kind mismatch:', { expected: input.kind, actual: payload.k });
    return false;
  }
  if (payload.pslug !== input.projectSlug) {
    console.log('[f-proxy] Token project slug mismatch:', { expected: input.projectSlug, actual: payload.pslug });
    return false;
  }
  if (payload.pid !== input.projectId) {
    console.log('[f-proxy] Token project ID mismatch:', { expected: input.projectId, actual: payload.pid });
    return false;
  }
  if (payload.path !== input.path) {
    console.log('[f-proxy] Token path mismatch:', { expected: input.path, actual: payload.path });
    return false;
  }

  const expected = payload.q;
  if (!matchesQuerySubset(searchParams, expected)) {
    console.log('[f-proxy] Token query subset mismatch:', { expected, actual: Object.fromEntries(searchParams) });
    return false;
  }

  const actualSubset = tokenQuerySubset(searchParams, input.allowedQueryKeys);
  for (const [k, v] of Object.entries(actualSubset)) {
    if (expected?.[k] !== v) {
      console.log('[f-proxy] Token query value mismatch:', { key: k, expected: expected?.[k], actual: v });
      return false;
    }
  }

  console.log('[f-proxy] Signed token validation successful for:', input.kind);
  return true;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
