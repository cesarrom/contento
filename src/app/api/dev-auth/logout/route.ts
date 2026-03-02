import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_AUTH_COOKIE, isDevAuthEnabled } from "@/lib/dev-auth";

export async function POST() {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "dev_auth_disabled" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_COOKIE);

  return NextResponse.json({ ok: true });
}
