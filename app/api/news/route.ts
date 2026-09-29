/**
 * app/api/news/route.ts → GET /api/news?limit=4
 * Daftar berita terbaru. Dipakai bagian sorotan berita di beranda.
 */
import { NextResponse } from 'next/server'
import { getPublishedNews } from '@/lib/news-public'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Jumlah berita dari parameter ?limit= (default 3, maksimal 30)
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 3, 30)
  try {
    return NextResponse.json(await getPublishedNews(limit))
  } catch {
    return NextResponse.json([])
  }
}
