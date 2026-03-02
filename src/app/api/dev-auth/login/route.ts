import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createDevAuthToken,
  DEV_AUTH_COOKIE,
  getDevAuthCredentials,
  isDevAuthEnabled,
} from "@/lib/dev-auth";

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "dev_auth_disabled" }, { status: 404 });
  }

  const { username, password } = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  const creds = getDevAuthCredentials();
  if (username !== creds.username || password !== creds.password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createDevAuthToken(username);

  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
