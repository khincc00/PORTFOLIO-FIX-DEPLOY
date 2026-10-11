/**
 * lib/games.ts
 * Tipe, validasi, dan bentuk data katalog game untuk halaman /games.
 * Aman dipakai di server maupun browser (tidak memakai kunci rahasia).
 */
import { slugify } from '@/lib/products'

// Satu baris di tabel games (dipakai admin)
export type Game = {
  id: number
  slug: string
  title: string
  stack: string | null
  description: string | null
  image: string | null
  play_url: string
  official_url: string
  official_label: string | null
  is_published: boolean
  position: number
  created_at: string
  updated_at: string
}

// Isi form dari admin
export type GameInput = {
  title: string
  stack: string
  description: string
  image: string
  play_url: string
  official_url: string
  official_label: string
  is_published: boolean
}

// Bentuk yang dibaca halaman /games (lihat public/games/index.html)
export type PublicGame = {
  id: string
  title: string
  stack: string
  image: string
  alt: string
  desc: string
  play: string
  official: string
  officialLabel: string
}

export const MAX_TITLE_LENGTH = 120
export const MAX_STACK_LENGTH = 120
export const MAX_DESCRIPTION_LENGTH = 1000
export const MAX_LABEL_LENGTH = 40

// Alamat http(s) lengkap, contoh https://khincc.itch.io/game
const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

// Cek dan rapikan isi form dari admin. Mengembalikan pesan error yang bisa langsung ditampilkan.
export function parseGameInput(body: unknown): { ok: true; value: GameInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Data game tidak valid.' }
  const raw = body as Record<string, unknown>
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '')

  const title = text('title')
  if (!title) return { ok: false, error: 'Nama game wajib diisi.' }
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: `Nama game maksimal ${MAX_TITLE_LENGTH} karakter.` }

  const stack = text('stack')
  if (stack.length > MAX_STACK_LENGTH) return { ok: false, error: `Stack maksimal ${MAX_STACK_LENGTH} karakter.` }

  const description = text('description')
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return { ok: false, error: `Deskripsi maksimal ${MAX_DESCRIPTION_LENGTH} karakter.` }

  const image = text('image')
  if (!image) return { ok: false, error: 'Gambar game wajib diisi.' }
  if (!(image.startsWith('/') || image.startsWith('https://')))
    return { ok: false, error: 'Alamat gambar harus diawali / atau https://.' }

  const play_url = text('play_url')
  if (!isHttpUrl(play_url)) return { ok: false, error: 'Link main harus berupa alamat lengkap, diawali https://.' }

  const official_url = text('official_url')
  if (!isHttpUrl(official_url)) return { ok: false, error: 'Link official harus berupa alamat lengkap, diawali https://.' }

  const official_label = text('official_label')
  if (official_label.length > MAX_LABEL_LENGTH)
    return { ok: false, error: `Nama tombol official maksimal ${MAX_LABEL_LENGTH} karakter.` }

  return {
    ok: true,
    value: {
      title,
      stack,
      description,
      image,
      play_url,
      official_url,
      official_label,
      is_published: typeof raw.is_published === 'boolean' ? raw.is_published : true,
    },
  }
}

// Alamat (slug) dari nama game. Kosong kalau nama tidak punya huruf atau angka sama sekali
export const gameSlug = (title: string) => slugify(title)

// Nama domain untuk tombol official kalau admin tidak mengisi labelnya, contoh khincc.itch.io
export function officialHostLabel(officialUrl: string) {
  try {
    return new URL(officialUrl).hostname.replace(/^www\./, '')
  } catch {
    return officialUrl
  }
}

// Ubah baris database menjadi bentuk yang dibaca halaman /games
export function toPublicGame(game: Game): PublicGame {
  return {
    id: game.slug,
    title: game.title,
    stack: game.stack ?? '',
    image: game.image ?? '',
    alt: 'Cover game ' + game.title,
    desc: game.description ?? '',
    play: game.play_url,
    official: game.official_url,
    officialLabel: game.official_label || officialHostLabel(game.official_url),
  }
}
