import type { Lang } from '@/lib/i18n'
import { campaignPosters, portfolioSeed, reelDetails, tiktokReviews, webProjects, youtubePortfolio } from '@/lib/portfolio-data'

// Portfolio entries managed from /admin → Portfolio. One table holds all three kinds.

export type PortfolioKind = 'design' | 'video' | 'web'
export type VideoPlatform = 'instagram' | 'tiktok' | 'youtube'
export const PORTFOLIO_KINDS: PortfolioKind[] = ['design', 'video', 'web']
export const VIDEO_PLATFORMS: VideoPlatform[] = ['instagram', 'youtube', 'tiktok']

export interface PortfolioLink {
  label: string
  href: string
}

export interface PortfolioItem {
  id: number
  kind: PortfolioKind
  title: string
  title_id: string | null // optional Indonesian title; falls back to title
  subtitle: string | null // design: category · video: original title · web: stack
  description: string | null
  description_id: string | null
  tag: string | null // video filter / label (e.g. "Audio", "Documentary")
  tag_id: string | null
  year: string | null
  platform: VideoPlatform | null
  image: string | null
  image_alt: string | null
  link: string | null
  extra_links: PortfolioLink[]
  position: number
  is_published: boolean
}

export type PortfolioInput = Omit<PortfolioItem, 'id'>

/** Localised text field with fallback to English */
export function loc(item: PortfolioItem, field: 'title' | 'description' | 'tag', lang: Lang) {
  const idValue = item[`${field}_id` as 'title_id' | 'description_id' | 'tag_id']
  return (lang === 'id' && idValue) || item[field] || ''
}

export function youtubeId(url: string | null) {
  const m = url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** Cover image; YouTube items without one use the video thumbnail */
export function coverOf(item: PortfolioItem) {
  if (item.image) return item.image
  const yt = item.platform === 'youtube' ? youtubeId(item.link) : null
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null
}

export function allLinks(item: PortfolioItem): PortfolioLink[] {
  const primary = item.link ? [{ label: item.kind === 'web' ? 'Live' : 'View', href: item.link }] : []
  return [...primary, ...(item.extra_links || [])]
}

const blank = (kind: PortfolioKind, position: number): PortfolioInput => ({
  kind,
  title: '',
  title_id: null,
  subtitle: null,
  description: null,
  description_id: null,
  tag: null,
  tag_id: null,
  year: null,
  platform: null,
  image: null,
  image_alt: null,
  link: null,
  extra_links: [],
  position,
  is_published: true,
})

export const emptyItem = blank

const groupLabel = { audio: ['Audio', 'Audio'], streaming: ['Streaming setup', 'Setup streaming'], gaming: ['Gaming gear', 'Gear gaming'] }
const ytType: Record<string, [string, string]> = {
  'Film pendek': ['Short film', 'Film pendek'],
  Dokumenter: ['Documentary', 'Dokumenter'],
  'Review perangkat': ['Gear review', 'Review perangkat'],
}

/**
 * The portfolio as it existed in code before the admin manager.
 * Used as the homepage fallback until the table exists, and to seed the table.
 */
export function defaultPortfolio(): PortfolioInput[] {
  const items: PortfolioInput[] = []
  const push = (kind: PortfolioKind, fields: Partial<PortfolioInput>) =>
    items.push({ ...blank(kind, items.filter((i) => i.kind === kind).length), ...fields })

  campaignPosters.forEach((p) =>
    push('design', {
      title: p.title,
      subtitle: p.category,
      year: p.year,
      description: p.description.en,
      description_id: p.description.id,
      image_alt: p.alt,
    })
  )

  portfolioSeed.forEach((r) => {
    const d = reelDetails[r.reel_id]
    const [tag, tagId] = d ? groupLabel[d.group] : [r.category, r.category]
    push('video', {
      platform: 'instagram',
      title: d?.title ?? r.title,
      description: d?.desc.en ?? r.description,
      description_id: d?.desc.id ?? r.description,
      tag,
      tag_id: tagId,
      link: r.link,
    })
  })
  youtubePortfolio.forEach((y) => {
    const [tag, tagId] = ytType[y.type] ?? [y.type, y.type]
    push('video', {
      platform: 'youtube',
      title: y.about.en,
      title_id: y.about.id,
      subtitle: y.title,
      tag,
      tag_id: tagId,
      link: y.link,
      image_alt: y.about.en,
    })
  })
  tiktokReviews.forEach((t) =>
    push('video', { platform: 'tiktok', title: t.title, description: t.desc, tag: t.platform, link: t.link })
  )

  webProjects.forEach((w) =>
    push('web', {
      title: w.title,
      subtitle: w.stack,
      description: w.desc.en,
      description_id: w.desc.id,
      image: w.image,
      image_alt: w.alt.en,
      link: w.links[0]?.href ?? null,
      extra_links: w.links.slice(1),
    })
  )

  return items
}

export function fallbackPortfolio(): PortfolioItem[] {
  return defaultPortfolio().map((item, i) => ({ ...item, id: -(i + 1) }))
}
