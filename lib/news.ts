export interface NewsPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_image: string | null
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

export type NewsSummary = Pick<
  NewsPost,
  'id' | 'title' | 'slug' | 'excerpt' | 'cover_image' | 'category' | 'published_at'
>

export const NEWS_SUMMARY_COLUMNS = 'id,title,slug,excerpt,cover_image,category,published_at'

export const newsCategories = ['Update', 'Project', 'Behind The Scenes', 'Review', 'Pengumuman']

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function formatNewsDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function readingTime(html: string) {
  const words = stripHtml(html).split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
