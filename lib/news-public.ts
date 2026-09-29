/**
 * lib/news-public.ts
 * Mengambil berita untuk pengunjung (halaman /berita, beranda, sitemap).
 *
 * Hanya berita berstatus 'published' dengan tanggal terbit yang sudah lewat
 * yang diambil. Aturan RLS di database juga menerapkan hal yang sama,
 * jadi draft tidak akan pernah bocor ke publik.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { NEWS_SUMMARY_COLUMNS, type NewsPost, type NewsSummary } from '@/lib/news'

// Daftar ringkas berita terbaru (tanpa isi lengkap), maksimal `limit` buah
export async function getPublishedNews(limit = 30): Promise<NewsSummary[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase
    .from('news')
    .select(NEWS_SUMMARY_COLUMNS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString()) // lte = "less than or equal": tanggal terbit ≤ sekarang
    .order('published_at', { ascending: false }) // terbaru di atas
    .limit(limit)
  return (data as NewsSummary[]) || []
}

// Satu berita lengkap berdasarkan slug (bagian URL, contoh /berita/judul-berita)
export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('news')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle() // hasilnya satu baris atau null (tidak error kalau tidak ada)
  return (data as NewsPost) || null
}
