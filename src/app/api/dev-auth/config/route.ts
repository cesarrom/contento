import { NextResponse } from "next/server";
import { isDevAuthEnabled, isAuthentikConfigured } from "@/lib/dev-auth";
import { isOidcConfigured, getProviderName } from "@/lib/auth";

export async function GET() {
  const devAuthEnabled = isDevAuthEnabled();
  const oidcConfigured = isOidcConfigured();
  
  return NextResponse.json({
    devAuthEnabled,
    authentikConfigured: oidcConfigured,
    providerName: oidcConfigured ? getProviderName() : null,
  });
}
