type SignedUrlTokenV1 = {
  v: 1;
  m: string;
  k: "raw" | "image" | "audio" | "video" | "upload";
  pslug?: string;
  pid?: string;
  path?: string;
  q?: Record<string, string>;
  iat: number;
  exp: number;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = bytesToBase64(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return base64ToBytes(padded);
}

function toUtf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const secretBytes = toUtf8Bytes(secret);
  const dataBytes = toUtf8Bytes(data);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, toArrayBuffer(dataBytes));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function getSignedUrlSecret(): string {
  const secret = process.env.CONTENTO_SIGNED_URL_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("CONTENTO_SIGNED_URL_SECRET (or NEXTAUTH_SECRET) must be set in production");
  }
  return secret;
}

export async function createSignedUrlToken(input: {
  method: string;
  kind: SignedUrlTokenV1["k"];
  projectSlug?: string;
  projectId?: string;
  path?: string;
  query?: Record<string, string>;
  expiresIn: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SignedUrlTokenV1 = {
    v: 1,
    m: input.method.toUpperCase(),
    k: input.kind,
    pslug: input.projectSlug,
    pid: input.projectId,
    path: input.path,
    q: input.query,
    iat: now,
    exp: now + input.expiresIn,
  };

  const body = base64UrlEncode(toUtf8Bytes(JSON.stringify(payload)));
  const sig = base64UrlEncode(await hmacSha256(getSignedUrlSecret(), body));
  return `${body}.${sig}`;
}

export async function verifySignedUrlToken(token: string): Promise<SignedUrlTokenV1 | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = base64UrlEncode(await hmacSha256(getSignedUrlSecret(), body));
  if (!constantTimeEqual(sig, expectedSig)) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(body));
    const payload = JSON.parse(json) as SignedUrlTokenV1;
    if (payload.v !== 1) return null;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function tokenQuerySubset(searchParams: URLSearchParams, allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const v = searchParams.get(key);
    if (v != null && v !== "") out[key] = v;
  }
  return out;
}

export function matchesQuerySubset(actual: URLSearchParams, expected?: Record<string, string>): boolean {
  if (!expected) return true;
  for (const [k, v] of Object.entries(expected)) {
    if (actual.get(k) !== v) return false;
  }
  return true;
}
