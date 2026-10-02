/**
 * lib/interactions-server.ts
 * Fungsi bantu komentar & reaksi yang hanya berjalan di SERVER.
 * Dipakai oleh API di app/api/news/[slug]/comments, reactions, dan interactions.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser, type SiteUser } from '@/lib/account'
import { isAdminRequest } from '@/lib/admin-auth'
import { VISITOR_COOKIE, getVisitorId, visitorCookieOptions } from '@/lib/user-auth'
import type { PublicComment } from '@/lib/interactions'

// Cari id berita dari slug, hanya kalau beritanya sudah terbit.
// Mencegah orang berkomentar di draft yang belum dipublikasikan.
export async function findPublishedNewsId(slug: string) {
  const { data } = await supabaseAdmin
    .from('news')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  return data?.id as number | undefined
}

// Siapa yang sedang membuka halaman: akun login, admin, atau tamu (dikenali dari cookie)
export async function getViewer() {
  const [user, isAdmin] = await Promise.all([getCurrentUser(), isAdminRequest()])
  const visitor = await getVisitorId()
  return {
    user,
    isAdmin,
    visitor,
    // Pengguna login dikenali dari akunnya (sama di semua perangkat); tamu dari cookie browser.
    // Kunci ini dipakai supaya satu orang hanya bisa memberi satu reaksi per emoji.
    reactionKey: user ? `u:${user.id}` : `v:${visitor.id}`,
  }
}

/** Simpan cookie pengenal tamu kalau id-nya baru dibuat pada permintaan ini */
export function withVisitorCookie(res: NextResponse, visitor: { id: string; fresh: boolean }) {
  if (visitor.fresh) res.cookies.set(VISITOR_COOKIE, visitor.id, visitorCookieOptions)
  return res
}

// Ubah baris komentar dari database jadi versi publik (tanpa IP, user_id, dll.)
export function toPublicComment(
  row: any,
  viewer: { user: SiteUser | null; isAdmin: boolean; visitor: { id: string } }
): PublicComment {
  // Komentar milik sendiri: sama akunnya, atau (kalau tamu) sama cookie browsernya
  const own = viewer.user ? row.user_id === viewer.user.id : !row.user_id && row.visitor_key === viewer.visitor.id
  return {
    id: row.id,
    author_name: row.author_name,
    author_type: row.author_type,
    body: row.body,
    created_at: row.created_at,
    can_delete: viewer.isAdmin || own, // admin boleh menghapus semua komentar
  }
}
