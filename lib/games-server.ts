/**
 * lib/games-server.ts
 * Mengambil game yang ditampilkan untuk halaman /games dan PWA Pocket. Hanya untuk server.
 * Memakai kunci publik (anon) sehingga RLS tetap berlaku: game yang disembunyikan tidak pernah terbaca.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toPublicGame, type Game, type PublicGame } from '@/lib/games'

export async function getPublishedGames(): Promise<PublicGame[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_published', true)
    .order('position')
    .order('id')
  // Kalau tabel belum dibuat atau koneksi gagal, halaman tetap tampil tanpa game (dicatat di log server)
  if (error) {
    console.error('Gagal membaca game:', error.message)
    return []
  }
  return (data as Game[]).map(toPublicGame)
}
