import { auth } from "@/lib/auth";
import { DEV_AUTH_COOKIE, isDevAuthEnabled, verifyDevAuthToken } from "@/lib/dev-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!session) {
      if (isDevAuthEnabled()) {
        const token = request.cookies.get(DEV_AUTH_COOKIE)?.value;
        if (token) {
          const payload = await verifyDevAuthToken(token);
          if (payload) return NextResponse.next();
        }
      }

      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    if (pathname.includes("/login")) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
