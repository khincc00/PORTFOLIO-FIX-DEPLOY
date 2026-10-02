/**
 * lib/community-server.ts
 * Fungsi bantu KOMUNITAS yang hanya berjalan di SERVER: cek akun, cek gambar, ambil data.
 * Semua akses database memakai service role, jadi hak akses dicek di sini dan di API.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getViewer } from '@/lib/interactions-server'
import {
  COMMUNITY_LIMITS,
  type CommunitySort,
  type CommunityViewer,
  type PublicCommunityComment,
  type PublicPost,
  type VoteValue,
} from '@/lib/community'

export const COMMUNITY_BUCKET = 'community-images'

// Pengunjung saat ini dalam bentuk ringkas (akun login + apakah admin)
export async function getCommunityViewer(): Promise<CommunityViewer> {
  const v = await getViewer()
  return { user: v.user, isAdmin: v.isAdmin }
}

// Tolak permintaan yang berasal dari website lain (perlindungan tambahan di atas cookie SameSite)
export function crossSite(req: Request) {
  const origin = req.headers.get('origin')
  return Boolean(origin && origin !== new URL(req.url).origin)
}

export const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status })

/**
 * Kenali jenis gambar dari ISI file (bukan dari nama atau tipe yang dikirim browser),
 * supaya file lain yang disamarkan sebagai gambar ditolak.
 */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' }
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  if (buf.length > 6 && ['GIF87a', 'GIF89a'].includes(buf.subarray(0, 6).toString('ascii'))) return { mime: 'image/gif', ext: 'gif' }
  return null
}

// Alamat publik dasar bucket gambar, contoh https://xxx.supabase.co/storage/v1/object/public/community-images/
export function imageUrlBase() {
  return supabaseAdmin.storage.from(COMMUNITY_BUCKET).getPublicUrl('x').data.publicUrl.slice(0, -1)
}

// Ubah alamat gambar jadi path di bucket. null kalau bukan gambar dari bucket komunitas
export function pathFromImageUrl(url: string) {
  const base = imageUrlBase()
  if (!url.startsWith(base)) return null
  const path = url.slice(base.length)
  return /^\d+\/[\w-]+\.(jpg|png|webp|gif)$/.test(path) ? path : null
}

// Jumlah baris milik user di tabel dalam 1 jam terakhir + waktu terbaru (untuk batas spam)
export async function recentActivity(table: 'community_posts' | 'community_comments' | 'community_uploads', userId: number) {
  const { data } = await supabaseAdmin
    .from(table)
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = data || []
  return { count: rows.length, lastAt: rows[0] ? new Date(rows[0].created_at).getTime() : 0 }
}

type Row = Record<string, any>
const authorOf = (row: Row) => ({
  display_name: row.author?.display_name || '[deleted]',
  username: row.author?.username || 'deleted',
})

// Vote milik pengunjung untuk sekumpulan target: { id → +1 / -1 }
async function myVotes(userId: number | undefined, type: 'post' | 'comment', ids: number[]) {
  const map = new Map<number, VoteValue>()
  if (!userId || ids.length === 0) return map
  const { data } = await supabaseAdmin
    .from('community_votes')
    .select('target_id,value')
    .eq('user_id', userId)
    .eq('target_type', type)
    .in('target_id', ids)
  for (const v of data || []) map.set(v.target_id, v.value as VoteValue)
  return map
}

const POST_COLUMNS = 'id,user_id,title,body,images,score,comment_count,created_at,author:site_users!user_id(display_name,username)'

async function toPublicPosts(rows: Row[], viewer: CommunityViewer): Promise<PublicPost[]> {
  const mine = await myVotes(viewer.user?.id, 'post', rows.map((r) => r.id))
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    images: r.images || [],
    score: r.score,
    comment_count: r.comment_count,
    created_at: r.created_at,
    author: authorOf(r),
    my_vote: mine.get(r.id) || 0,
    can_delete: viewer.isAdmin || (!!viewer.user && viewer.user.id === r.user_id),
  }))
}

export async function listPosts(sort: CommunitySort, viewer: CommunityViewer, limit = 30): Promise<PublicPost[]> {
  let query = supabaseAdmin.from('community_posts').select(POST_COLUMNS)
  query = sort === 'top' ? query.order('score', { ascending: false }).order('created_at', { ascending: false }) : query.order('created_at', { ascending: false })
  const { data, error } = await query.limit(limit)
  if (error) throw error
  return toPublicPosts(data || [], viewer)
}

export async function getPost(id: number, viewer: CommunityViewer): Promise<PublicPost | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  const { data } = await supabaseAdmin.from('community_posts').select(POST_COLUMNS).eq('id', id).maybeSingle()
  return data ? (await toPublicPosts([data], viewer))[0] : null
}

export async function listComments(postId: number, viewer: CommunityViewer): Promise<PublicCommunityComment[]> {
  const { data, error } = await supabaseAdmin
    .from('community_comments')
    .select('id,post_id,parent_id,user_id,body,score,created_at,author:site_users!user_id(display_name,username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  const rows = data || []
  const mine = await myVotes(viewer.user?.id, 'comment', rows.map((r) => r.id))
  return rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    parent_id: r.parent_id,
    body: r.body,
    score: r.score,
    created_at: r.created_at,
    author: authorOf(r),
    my_vote: mine.get(r.id) || 0,
    can_delete: viewer.isAdmin || (!!viewer.user && viewer.user.id === r.user_id),
  }))
}

// Hapus gambar dari bucket (dipanggil setelah kiriman dihapus; kegagalan tidak menghentikan proses)
export async function removeImages(urls: string[]) {
  const paths = urls.map(pathFromImageUrl).filter((p): p is string => !!p)
  if (!paths.length) return
  await supabaseAdmin.storage.from(COMMUNITY_BUCKET).remove(paths).catch(() => {})
  await supabaseAdmin.from('community_uploads').delete().in('path', paths).then(() => {}, () => {})
}

export { COMMUNITY_LIMITS }
