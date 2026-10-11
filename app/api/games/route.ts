/**
 * app/api/games/route.ts → GET /api/games
 * Daftar game yang ditampilkan di halaman /games (public/games/index.html).
 */
import { NextResponse } from 'next/server'
import { getPublishedGames } from '@/lib/games-server'

// Selalu dijalankan ulang di setiap permintaan, supaya perubahan dari admin langsung tampil
export const dynamic = 'force-dynamic'

export async function GET() {
  const games = await getPublishedGames()
  return NextResponse.json(games)
}
