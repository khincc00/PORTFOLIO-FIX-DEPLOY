/**
 * lib/news.ts
 * Tipe data berita dan fungsi bantu kecil (slug, hapus HTML, tanggal, waktu baca).
 * Tidak berisi kode khusus server, jadi bisa dipakai di admin (browser) maupun server.
 */

// Bentuk satu baris di tabel `news` (lihat supabase/schema.sql bagian 7)
export interface NewsPost {
  id: number
  title: string
  slug: string // bagian URL, contoh "rilis-video-baru" → /berita/rilis-video-baru
  excerpt: string | null // ringkasan singkat untuk kartu berita
  content: string // isi lengkap dalam HTML
  cover_image: string | null
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

// Versi ringkas (tanpa isi lengkap) untuk daftar berita, supaya data yang dikirim lebih kecil
export type NewsSummary = Pick<
  NewsPost,
  'id' | 'title' | 'slug' | 'excerpt' | 'cover_image' | 'category' | 'published_at'
>

// Kolom yang diambil dari database untuk NewsSummary
export const NEWS_SUMMARY_COLUMNS = 'id,title,slug,excerpt,cover_image,category,published_at'

// Pilihan kategori di form admin
export const newsCategories = ['Update', 'Project', 'Behind The Scenes', 'Review', 'Pengumuman']

// Ubah judul jadi slug URL. Contoh: "Rilis Video Baru!" → "rilis-video-baru"
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD') // pisahkan huruf dan tanda aksen (é → e + ´)
    .replace(/[̀-ͯ]/g, '') // buang tanda aksennya
    .replace(/[^a-z0-9\s-]/g, '') // buang semua selain huruf, angka, spasi, dan strip
    .trim()
    .replace(/[\s-]+/g, '-') // spasi jadi strip
    .slice(0, 80) // maksimal 80 karakter
}

// Hapus semua tag HTML, sisakan teksnya saja
export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Format tanggal gaya Indonesia, contoh "30 September 2026" (dipakai di admin)
export function formatNewsDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Perkiraan waktu baca dalam menit (rata-rata 200 kata per menit, minimal 1 menit)
export function readingTime(html: string) {
  const words = stripHtml(html).split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
