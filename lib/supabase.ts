/**
 * lib/supabase.ts
 * Koneksi Supabase PUBLIK (kunci anon / publishable).
 *
 * Dipakai untuk membaca data yang memang boleh dilihat semua orang,
 * misalnya berita yang sudah terbit dan portfolio yang ditampilkan.
 * Hak aksesnya dibatasi oleh aturan RLS di database (lihat supabase/schema.sql),
 * jadi aman walaupun kuncinya terlihat di browser.
 */
import { createClient } from '@supabase/supabase-js'

// Nilai diambil dari file .env.local. Awalan NEXT_PUBLIC_ artinya boleh terlihat di browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

// Cek apakah pengaturan Supabase sudah diisi dengan benar (bukan contoh "your-project")
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('http')
)

// Kalau belum diisi, pakai alamat palsu supaya createClient tidak error saat build
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'placeholder-anon-key'
)

export { createClient }
