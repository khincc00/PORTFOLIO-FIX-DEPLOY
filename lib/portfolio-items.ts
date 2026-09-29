import type { Lang } from '@/lib/i18n'
import { campaignPosters, portfolioSeed, reelDetails, tiktokReviews, webProjects, youtubePortfolio } from '@/lib/portfolio-data'

/**
 * lib/portfolio-items.ts
 * Tipe data dan fungsi bantu PORTFOLIO (Design, Video, Web).
 *
 * Semua karya disimpan di satu tabel Supabase: `portfolio_items`
 * (lihat supabase/schema.sql bagian 12 & 13) dan diatur dari Admin → Portfolio.
 * File ini tidak berisi kode khusus server, jadi dipakai di admin (browser),
 * beranda, halaman /work, dan API.
 */

// Jenis karya dan platform video yang diizinkan
export type PortfolioKind = 'design' | 'video' | 'web'
export type VideoPlatform = 'instagram' | 'tiktok' | 'youtube'
export const PORTFOLIO_KINDS: PortfolioKind[] = ['design', 'video', 'web']
export const VIDEO_PLATFORMS: VideoPlatform[] = ['instagram', 'youtube', 'tiktok']

// Satu link tambahan, contoh { label: 'GitHub', href: 'https://github.com/...' }
export interface PortfolioLink {
  label: string
  href: string
}

// Bentuk satu baris di tabel portfolio_items
export interface PortfolioItem {
  id: number
  kind: PortfolioKind
  title: string
  title_id: string | null // judul versi Indonesia (opsional); kalau kosong pakai `title`
  subtitle: string | null // design: kategori · video: judul asli · web: teknologi yang dipakai
  description: string | null
  description_id: string | null
  tag: string | null // label/filter video (contoh "Audio", "Documentary")
  tag_id: string | null
  year: string | null
  platform: VideoPlatform | null
  image: string | null
  image_alt: string | null
  link: string | null
  extra_links: PortfolioLink[]
  position: number // urutan tampil (0 = paling atas), diatur dengan tombol ↑ ↓ di admin
  is_published: boolean // false = disembunyikan dari website
  is_featured?: boolean // true = di-highlight, tampil di beranda. Semua karya tetap tampil di /work
}

// Data karya sebelum disimpan (belum punya id dari database)
export type PortfolioInput = Omit<PortfolioItem, 'id'>

/** Ambil judul/deskripsi/tag sesuai bahasa. Kalau versi Indonesia kosong, pakai versi Inggris */
export function loc(item: PortfolioItem, field: 'title' | 'description' | 'tag', lang: Lang) {
  const idValue = item[`${field}_id` as 'title_id' | 'description_id' | 'tag_id']
  return (lang === 'id' && idValue) || item[field] || ''
}

// Ambil id video (11 karakter) dari berbagai bentuk link YouTube (youtu.be, watch?v=, shorts, embed)
export function youtubeId(url: string | null) {
  const m = url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** Gambar sampul karya. Video YouTube tanpa gambar otomatis memakai thumbnail dari YouTube */
export function coverOf(item: PortfolioItem) {
  if (item.image) return item.image
  const yt = item.platform === 'youtube' ? youtubeId(item.link) : null
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null
}

// Semua link sebuah karya: link utama (label "Live" untuk web, "View" untuk lainnya) + link tambahan
export function allLinks(item: PortfolioItem): PortfolioLink[] {
  const primary = item.link ? [{ label: item.kind === 'web' ? 'Live' : 'View', href: item.link }] : []
  return [...primary, ...(item.extra_links || [])]
}

// Karya kosong sebagai titik awal form "+ Tambah" di admin
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
  is_featured: false,
})

export const emptyItem = blank

/**
 * Pilihan highlight AWAL untuk beranda, disesuaikan dengan fokus website
 * (desain kampanye & video pendek untuk brand teknologi & gear):
 * karya pesanan klien/brand didahulukan, satu karya kuat per jenis, tanpa yang mirip-mirip.
 * Dipakai juga sebagai cadangan kalau kolom is_featured belum ada di database.
 * Setelah itu, highlight diatur dari admin (tombol ★).
 */
export const DEFAULT_FEATURED = new Set([
  // Design: kampanye klien sungguhan + satu karya editorial untuk menunjukkan variasi
  'Online Loan Awareness',
  'Digital Safety Campaign',
  'Down Under Brew',
  // Reels: brief dari Fantech / WYVERN / Secondwave, mencakup audio, gaming, dan streaming
  'Fantech Groove ANC Zoro',
  'Fantech Tanto Mouse Dock',
  'WYVERN PRO IEM Gaming',
  'Fantech WGP-13S Gamepad',
  'Secondwave e1',
  'Budget Setup Under Rp500k',
  // YouTube: film cerita, dokumenter perusahaan, dan review brand
  'Short film for the 2023 Indonesian National Police anniversary',
  'Documentary of a mental & physical training course for PT KPC',
  'Fantech Groove ANC earbuds review',
  // Web: kedua proyek
  'CodeQuest — Small Studio',
  'khincreator.com',
])

/** Apakah karya ini di-highlight? Pakai pilihan admin; kalau belum ada, pakai daftar awal di atas */
export const isFeatured = (item: PortfolioItem) =>
  typeof item.is_featured === 'boolean' ? item.is_featured : DEFAULT_FEATURED.has(item.title)

// Terjemahan label grup reel lama → [Inggris, Indonesia]
const groupLabel = { audio: ['Audio', 'Audio'], streaming: ['Streaming setup', 'Setup streaming'], gaming: ['Gaming gear', 'Gear gaming'] }
// Terjemahan jenis video YouTube lama → [Inggris, Indonesia]
const ytType: Record<string, [string, string]> = {
  'Film pendek': ['Short film', 'Film pendek'],
  Dokumenter: ['Documentary', 'Dokumenter'],
  'Review perangkat': ['Gear review', 'Review perangkat'],
}

/**
 * Susun ulang data lama di lib/portfolio-data.ts menjadi format portfolio_items.
 * Dipakai untuk cadangan beranda (kalau database tidak bisa diakses)
 * dan dulu dipakai untuk mengisi tabel pertama kali.
 */
export function defaultPortfolio(): PortfolioInput[] {
  const items: PortfolioInput[] = []
  // Tambahkan satu karya; posisinya = jumlah karya sejenis yang sudah ada (jadi urut 0, 1, 2, ...)
  const push = (kind: PortfolioKind, fields: Partial<PortfolioInput>) =>
    items.push({ ...blank(kind, items.filter((i) => i.kind === kind).length), ...fields })

  // Poster → Design
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

  // Reels Instagram → Video (instagram), memakai judul & deskripsi rapi dari reelDetails
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
  // YouTube → Video (youtube)
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
  // TikTok → Video (tiktok)
  tiktokReviews.forEach((t) =>
    push('video', { platform: 'tiktok', title: t.title, description: t.desc, tag: t.platform, link: t.link })
  )

  // Proyek web → Web; link pertama jadi link utama
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

  return items.map((item) => ({ ...item, is_featured: DEFAULT_FEATURED.has(item.title) }))
}

// Versi cadangan dengan id negatif (supaya tidak bentrok dengan id asli dari database)
export function fallbackPortfolio(): PortfolioItem[] {
  return defaultPortfolio().map((item, i) => ({ ...item, id: -(i + 1) }))
}

/** Kelompokkan karya per bagian halaman: desain, reels, YouTube, TikTok, web */
export function splitPortfolio(items: PortfolioItem[]) {
  return {
    designs: items.filter((i) => i.kind === 'design'),
    reels: items.filter((i) => i.kind === 'video' && i.platform === 'instagram'),
    films: items.filter((i) => i.kind === 'video' && i.platform === 'youtube'),
    shorts: items.filter((i) => i.kind === 'video' && i.platform === 'tiktok'),
    webs: items.filter((i) => i.kind === 'web'),
  }
}

// Jumlah karya per bagian, contoh { designs: 5, reels: 14, ... } untuk link "See all"
export type PortfolioTotals = Record<keyof ReturnType<typeof splitPortfolio>, number>
