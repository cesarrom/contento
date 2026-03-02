import { NextResponse } from "next/server";
import { isAuthentikConfigured, isDevAuthEnabled } from "@/lib/dev-auth";

export async function GET() {
  return NextResponse.json({
    devAuthEnabled: isDevAuthEnabled(),
    authentikConfigured: isAuthentikConfigured(),
  });
}
