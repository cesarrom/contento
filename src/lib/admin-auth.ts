import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { DEV_AUTH_COOKIE, isDevAuthEnabled, verifyDevAuthToken } from "@/lib/dev-auth";

export type AdminAuthSession =
  | { type: "nextauth"; email: string }
  | { type: "dev"; email: string };

export async function getAdminSession(): Promise<AdminAuthSession | null> {
  const nextAuthSession = await auth();
  if (nextAuthSession) {
    return { type: "nextauth", email: nextAuthSession.user?.email || "signed-in" };
  }

  if (!isDevAuthEnabled()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(DEV_AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyDevAuthToken(token);
  if (!payload) return null;

  return { type: "dev", email: payload.sub };
}
