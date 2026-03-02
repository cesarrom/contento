type DevAuthTokenPayload = {
  v: 1;
  sub: string;
  iat: number;
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

async function hmacSha256WebCrypto(secret: string, data: string): Promise<Uint8Array> {
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

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  return hmacSha256WebCrypto(secret, data);
}

export const DEV_AUTH_COOKIE = "contento_dev_auth";

export function isDevAuthEnabled(): boolean {
  return process.env.DEV_AUTH === "1";
}

export function isAuthentikConfigured(): boolean {
  return Boolean(process.env.AUTHENTIK_ISSUER && process.env.AUTHENTIK_CLIENT_ID && process.env.AUTHENTIK_CLIENT_SECRET);
}

export function getDevAuthSecret(): string {
  return process.env.DEV_AUTH_SECRET || "dev-auth-secret";
}

export function getDevAuthCredentials(): { username: string; password: string } {
  return {
    username: process.env.DEV_AUTH_USERNAME || "admin",
    password: process.env.DEV_AUTH_PASSWORD || "admin",
  };
}

export async function createDevAuthToken(sub: string): Promise<string> {
  const payload: DevAuthTokenPayload = {
    v: 1,
    sub,
    iat: Math.floor(Date.now() / 1000),
  };

  const body = base64UrlEncode(toUtf8Bytes(JSON.stringify(payload)));
  const sig = base64UrlEncode(await hmacSha256(getDevAuthSecret(), body));
  return `${body}.${sig}`;
}

export async function verifyDevAuthToken(token: string): Promise<DevAuthTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = base64UrlEncode(await hmacSha256(getDevAuthSecret(), body));
  if (sig !== expectedSig) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(body));
    const payload = JSON.parse(json) as DevAuthTokenPayload;
    if (payload.v !== 1) return null;
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
