import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizeNewsHtml } from '@/lib/sanitize'
import { slugify, stripHtml } from '@/lib/news'

// Server-only helpers shared by the admin news routes

export function buildNewsPayload(body: any) {
  const title = String(body.title || '').trim()
  if (!title) throw new Error('Judul berita wajib diisi.')

  const content = sanitizeNewsHtml(String(body.content || ''))
  const status = body.status === 'published' ? 'published' : 'draft'
  const excerpt = String(body.excerpt || '').trim() || stripHtml(content).slice(0, 180)
  const tags = (Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(','))
    .map((t: string) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12)

  let published_at: string | null = body.published_at ? new Date(body.published_at).toISOString() : null
  if (status === 'published' && !published_at) published_at = new Date().toISOString()

  const cover = String(body.cover_image || '').trim()

  return {
    title,
    slug: slugify(String(body.slug || '')) || slugify(title) || `berita-${Date.now()}`,
    excerpt,
    content,
    cover_image: /^https?:\/\//.test(cover) ? cover : null,
    category: String(body.category || 'Update').trim() || 'Update',
    tags,
    status,
    published_at,
    updated_at: new Date().toISOString(),
  }
}

// Append -2, -3, ... when another post already uses the slug
export async function uniqueSlug(base: string, excludeId?: number) {
  const { data } = await supabaseAdmin.from('news').select('id,slug').like('slug', `${base}%`)
  const taken = new Set((data || []).filter((r) => r.id !== excludeId).map((r) => r.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function revalidateNews(slug?: string) {
  revalidatePath('/berita')
  revalidatePath('/sitemap.xml')
  if (slug) revalidatePath(`/berita/${slug}`)
}
