/**
 * lib/interactions.ts
 * Aturan dan tipe data untuk komentar & reaksi berita.
 *
 * Dipakai bersama oleh:
 * - API di app/api/news/[slug]/... (server)
 * - Komponen app/berita/[slug]/NewsInteractions.tsx (browser)
 * Karena dipakai di dua sisi, file ini tidak boleh berisi kode khusus server.
 */

// Daftar emoji reaksi yang tersedia. `as const` membuat daftar ini tidak bisa diubah
export const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '👏'] as const
// Tipe Reaction = salah satu emoji di atas
export type Reaction = (typeof REACTIONS)[number]

// Batas komentar: panjang nama, panjang isi, dan jumlah link maksimal (anti spam)
export const COMMENT_LIMITS = { nameMin: 2, nameMax: 40, bodyMin: 2, bodyMax: 1000, maxLinks: 2 }

// Bentuk satu komentar yang dikirim ke browser (tanpa data sensitif seperti IP)
export interface PublicComment {
  id: number
  author_name: string
  author_type: 'guest' | 'member' | 'admin' // tamu, anggota terdaftar, atau admin
  body: string
  created_at: string
  can_delete: boolean // true kalau pengunjung ini boleh menghapusnya (pemilik atau admin)
}

// Semua data interaksi satu berita yang dikirim API ke browser sekaligus
export interface InteractionsPayload {
  comments: PublicComment[]
  reactions: Record<string, number> // jumlah tiap emoji, contoh { '🔥': 3 }
  mine: string[] // emoji yang sudah diklik pengunjung ini
  user: { id: number; username: string; display_name: string } | null // akun yang sedang login
  isAdmin: boolean
}
