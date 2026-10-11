/**
 * app/api/games/route.ts → GET /api/games
 * Daftar game yang ditampilkan di halaman /games (public/games/index.html).
 * Memakai kunci publik (anon) sehingga RLS tetap berlaku: game yang disembunyikan tidak pernah terbaca.
 */
import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toPublicGame, type Game } from '@/lib/games'

// Selalu dijalankan ulang di setiap permintaan, supaya perubahan dari admin langsung tampil
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json([])

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_published', true)
    .order('position')
    .order('id')
  if (error) {
    console.error('Gagal membaca game:', error.message)
    return NextResponse.json({ error: 'Katalog game belum bisa dimuat.' }, { status: 500 })
  }
  return NextResponse.json((data as Game[]).map(toPublicGame))
}
