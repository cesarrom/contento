import { auth } from "@/lib/auth";
import { DEV_AUTH_COOKIE, isDevAuthEnabled, verifyDevAuthToken } from "@/lib/dev-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";

const { rewrite: rewriteLLM } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Serve raw Markdown for AI agents that send Accept: text/markdown
  if (pathname.startsWith("/docs") && isMarkdownPreferred(request)) {
    const result = rewriteLLM(pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

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

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}
