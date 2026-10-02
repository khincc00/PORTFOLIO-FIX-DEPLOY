/**
 * lib/portfolio-server.ts
 * Fungsi portfolio yang hanya berjalan di SERVER.
 * Dipakai oleh app/page.tsx (beranda), app/work/page.tsx, dan API admin portfolio.
 */
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

/**
 * Ambil semua karya yang ditampilkan (is_published = true), urut per jenis lalu per posisi.
 * Kalau database error atau tabel masih kosong, pakai daftar bawaan dari kode
 * supaya website tidak pernah tampil kosong.
 */
export async function getPublishedPortfolio(): Promise<PortfolioItem[]> {
  if (!isSupabaseConfigured) return fallbackPortfolio()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_published', true)
    .order('kind')
    .order('position')
  if (error) throw new Error('Portfolio belum dapat dimuat dari database.')
  // An intentionally empty public portfolio must remain empty. Otherwise hidden
  // or deleted work would incorrectly reappear from the seed.
  if (!data) return []
  return data as PortfolioItem[]
}

// Rapikan input teks: ubah ke string, hapus spasi di ujung, potong sesuai batas. Kosong → null
const text = (v: unknown, max = 2000) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

const url = (v: unknown) => {
  const s = text(v, 1000)
  // Hanya terima link http(s) atau alamat di website sendiri (contoh /work/shot.jpg).
  // Link lain seperti javascript: ditolak demi keamanan
  return s && (/^https?:\/\//.test(s) || s.startsWith('/')) ? s : null
}

/**
 * Ubah data dari form admin jadi data yang aman disimpan ke tabel portfolio_items.
 * Kalau ada yang tidak valid (jenis salah, judul kosong, platform video belum dipilih),
 * fungsi ini melempar error dan pesannya ditampilkan di admin.
 * `position` tidak diatur di sini karena urutan diatur lewat tombol ↑ ↓ (API reorder).
 */
export function buildPortfolioPayload(body: any): Omit<PortfolioInput, 'position'> {
  const kind = body.kind as PortfolioKind
  if (!PORTFOLIO_KINDS.includes(kind)) throw new Error('Jenis portfolio tidak valid.')
  const title = text(body.title, 200)
  if (!title) throw new Error('Judul wajib diisi.')
  // Platform hanya berlaku untuk video (instagram / youtube / tiktok)
  const platform = kind === 'video' && VIDEO_PLATFORMS.includes(body.platform) ? (body.platform as VideoPlatform) : null
  if (kind === 'video' && !platform) throw new Error('Pilih platform video.')

  // Link tambahan (misalnya GitHub, itch.io): buang yang tidak valid, maksimal 6
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
    is_published: body.is_published !== false, // default: tampil
    is_featured: body.is_featured === true, // default: tidak di-highlight di beranda
  }
}

// Minta Next.js membuat ulang beranda dan /work supaya perubahan dari admin langsung terlihat
export function revalidatePortfolio() {
  revalidatePath('/')
  revalidatePath('/work')
  revalidatePath('/app')
}
