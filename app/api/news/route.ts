import { NextResponse } from 'next/server'
import { getPublishedNews } from '@/lib/news-public'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 3, 30)
  try {
    return NextResponse.json(await getPublishedNews(limit))
  } catch {
    return NextResponse.json([])
  }
}
