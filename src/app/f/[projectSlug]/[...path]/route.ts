import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; path: string[] }> }
) {
  const { projectSlug } = await params;
  return NextResponse.json(
    {
      error: "gone",
      message:
        "Legacy /f/:projectSlug/* route has been removed. Use /f/raw|image|audio|video/:projectSlug/* instead.",
      projectSlug,
    },
    { status: 410 }
  );
}
