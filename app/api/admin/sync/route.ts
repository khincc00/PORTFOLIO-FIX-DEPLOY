import { NextResponse } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { getSyncStatus, syncPublishedContent } from "@/lib/github-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdminRequest())) return unauthorized();
  return NextResponse.json(await getSyncStatus(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return NextResponse.json(
      { error: "Origin tidak diizinkan." },
      { status: 403 },
    );
  return NextResponse.json(await syncPublishedContent(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
