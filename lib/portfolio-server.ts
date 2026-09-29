import { revalidatePath } from 'next/cache'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  PORTFOLIO_KINDS,
  VIDEO_PLATFORMS,
  fallbackPortfolio,
  type PortfolioInput,
  type PortfolioItem,
  type PortfolioKind,
  type VideoPlatform,
} from '@/lib/portfolio-items'

/** Published items for the homepage; falls back to the built-in list until the table exists or has rows */
export async function getPublishedPortfolio(): Promise<PortfolioItem[]> {
  if (!isSupabaseConfigured) return fallbackPortfolio()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_published', true)
    .order('kind')
    .order('position')
  if (error || !data?.length) return fallbackPortfolio()
  return data as PortfolioItem[]
}

const text = (v: unknown, max = 2000) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

const url = (v: unknown) => {
  const s = text(v, 1000)
  // Allow site-relative paths (e.g. /work/shot.jpg) and http(s) URLs only
  return s && (/^https?:\/\//.test(s) || s.startsWith('/')) ? s : null
}

export function buildPortfolioPayload(body: any): Omit<PortfolioInput, 'position'> {
  const kind = body.kind as PortfolioKind
  if (!PORTFOLIO_KINDS.includes(kind)) throw new Error('Jenis portfolio tidak valid.')
  const title = text(body.title, 200)
  if (!title) throw new Error('Judul wajib diisi.')
  const platform = kind === 'video' && VIDEO_PLATFORMS.includes(body.platform) ? (body.platform as VideoPlatform) : null
  if (kind === 'video' && !platform) throw new Error('Pilih platform video.')

  const extra_links = (Array.isArray(body.extra_links) ? body.extra_links : [])
    .map((l: any) => ({ label: text(l?.label, 40) || 'Link', href: url(l?.href) }))
    .filter((l: any) => l.href)
    .slice(0, 6)

  return {
    kind,
    title,
    title_id: text(body.title_id, 200),
    subtitle: text(body.subtitle, 200),
    description: text(body.description),
    description_id: text(body.description_id),
    tag: text(body.tag, 60),
    tag_id: text(body.tag_id, 60),
    year: text(body.year, 20),
    platform,
    image: url(body.image),
    image_alt: text(body.image_alt, 300),
    link: url(body.link),
    extra_links,
    is_published: body.is_published !== false,
    is_featured: body.is_featured === true,
  }
}

export function revalidatePortfolio() {
  revalidatePath('/')
}
