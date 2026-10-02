import { NextResponse } from "next/server";
import { getPublishedNews } from "@/lib/news-public";
import { getPublishedPortfolio } from "@/lib/portfolio-server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [news, portfolio] = await Promise.all([
      getPublishedNews(30),
      getPublishedPortfolio(),
    ]);
    return NextResponse.json(
      { news, portfolio },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Pembaruan belum dapat dimuat. Coba lagi." },
      { status: 503 },
    );
  }
}
