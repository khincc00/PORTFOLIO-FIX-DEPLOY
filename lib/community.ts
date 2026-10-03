/**
 * lib/community.ts
 * Aturan dan tipe data KOMUNITAS (kiriman, komentar, vote). Dipakai server dan browser,
 * jadi tidak boleh berisi kode khusus server.
 */

// Batas isian dan anti-spam. Angka yang sama dicek ulang di server (jangan hanya percaya browser)
export const COMMUNITY_LIMITS = {
  titleMin: 3,
  titleMax: 140,
  bodyMax: 5000,
  commentMax: 1500,
  maxImages: 4,
  maxLinks: 3,
  imageBytes: 4 * 1024 * 1024, // Vercel membatasi body request ±4.5MB
  postsPerHour: 5,
  commentsPerHour: 20,
  uploadsPerHour: 12,
  secondsBetweenPosts: 30,
  secondsBetweenComments: 15,
  reportReasonMax: 200,
} as const

export type VoteValue = -1 | 0 | 1
export type VoteTarget = 'post' | 'comment'

// Akun penulis resmi untuk kiriman/komentar yang dibuat admin (dibuat otomatis saat pertama dipakai).
// Nama ini ada di RESERVED_NAMES, jadi pengunjung tidak bisa mendaftar dengan nama yang sama
export const ADMIN_AUTHOR = { username: 'khincc', display_name: 'Khincc' } as const

export interface CommunityAuthor {
  display_name: string
  username: string
  is_admin: boolean // true = akun resmi admin (ditampilkan dengan lencana "Admin")
}

// Satu kiriman yang dikirim ke browser (tanpa IP, user_id, dan data sensitif lain)
export interface PublicPost {
  id: number
  title: string
  body: string
  images: string[]
  score: number
  comment_count: number
  created_at: string
  author: CommunityAuthor
  my_vote: VoteValue
  can_delete: boolean // pemilik atau admin
}

export interface PublicCommunityComment {
  id: number
  post_id: number
  parent_id: number | null
  body: string
  score: number
  created_at: string
  author: CommunityAuthor
  my_vote: VoteValue
  can_delete: boolean
}

// Siapa yang sedang membuka halaman
export interface CommunityViewer {
  user: { id: number; username: string; display_name: string } | null
  isAdmin: boolean
  asAdmin?: boolean // true = `user` adalah akun resmi admin (admin login tanpa akun anggota)
}

export type CommunitySort = 'new' | 'top'
export const parseSort = (value: unknown): CommunitySort => (value === 'top' ? 'top' : 'new')

// Hitung jumlah link di teks (spam biasanya berisi banyak link)
export const countLinks = (text: string) => (text.match(/https?:\/\/|www\./gi) || []).length

// Rapikan baris baru: maksimal satu baris kosong berturut-turut
export const tidyText = (text: string) =>
  text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
