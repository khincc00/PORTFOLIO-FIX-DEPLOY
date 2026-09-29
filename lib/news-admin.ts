/**
 * lib/news-admin.ts
 * Fungsi bantu untuk API admin berita (tambah & edit berita). Hanya untuk server.
 */
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizeNewsHtml } from '@/lib/sanitize'
import { slugify, stripHtml } from '@/lib/news'

/**
 * Ubah data dari form admin jadi data yang siap disimpan ke tabel `news`.
 * Semua input dirapikan dan divalidasi di sini, jadi data yang masuk database selalu bersih.
 */
export function buildNewsPayload(body: any) {
  const title = String(body.title || '').trim()
  if (!title) throw new Error('Judul berita wajib diisi.')

  // Bersihkan HTML dari kode berbahaya (lihat lib/sanitize.ts)
  const content = sanitizeNewsHtml(String(body.content || ''))
  const status = body.status === 'published' ? 'published' : 'draft'
  // Kalau ringkasan kosong, ambil 180 huruf pertama dari isi berita
  const excerpt = String(body.excerpt || '').trim() || stripHtml(content).slice(0, 180)
  // Tag bisa dikirim sebagai array atau teks dipisah koma; maksimal 12 tag
  const tags = (Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(','))
    .map((t: string) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12)

  // Tanggal terbit: pakai yang diisi admin, atau sekarang kalau langsung dipublikasikan
  let published_at: string | null = body.published_at ? new Date(body.published_at).toISOString() : null
  if (status === 'published' && !published_at) published_at = new Date().toISOString()

  const cover = String(body.cover_image || '').trim()

  return {
    title,
    // Slug dari isian admin, atau dari judul, atau cadangan "berita-<angka waktu>"
    slug: slugify(String(body.slug || '')) || slugify(title) || `berita-${Date.now()}`,
    excerpt,
    content,
    cover_image: /^https?:\/\//.test(cover) ? cover : null, // hanya link http/https
    category: String(body.category || 'Update').trim() || 'Update',
    tags,
    status,
    published_at,
    updated_at: new Date().toISOString(),
  }
}

// Kalau slug sudah dipakai berita lain, tambahkan -2, -3, dst. supaya URL tetap unik
export async function uniqueSlug(base: string, excludeId?: number) {
  const { data } = await supabaseAdmin.from('news').select('id,slug').like('slug', `${base}%`)
  // excludeId = berita yang sedang diedit, supaya slug miliknya sendiri tidak dianggap bentrok
  const taken = new Set((data || []).filter((r) => r.id !== excludeId).map((r) => r.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Minta Next.js membuat ulang halaman berita supaya perubahan langsung terlihat
// (tanpa ini, halaman lama di cache baru diperbarui beberapa menit kemudian)
export function revalidateNews(slug?: string) {
  revalidatePath('/berita')
  revalidatePath('/sitemap.xml')
  if (slug) revalidatePath(`/berita/${slug}`)
}
