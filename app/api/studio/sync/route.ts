import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/admin-auth";
import { syncPublishedContent } from "@/lib/github-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CONTENT_SYNC_CRON_SECRET;
  if (
    !secret ||
    !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncPublishedContent();
  return NextResponse.json(result, {
    status: result.status === "error" || result.status === "setup" ? 503 : 200,
  });
}
