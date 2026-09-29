/**
 * app/api/news/[slug]/interactions/route.ts → GET /api/news/<slug>/interactions
 * Dipanggil halaman berita saat dibuka, untuk mengambil semua data interaksi sekaligus.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { findPublishedNewsId, getViewer, toPublicComment } from '@/lib/interactions-server'
import type { InteractionsPayload } from '@/lib/interactions'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

// Komentar + jumlah reaksi + status login pengunjung untuk satu berita
export async function GET(_req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: st('err.disabled') }, { status: 503 })

  const newsId = await findPublishedNewsId(params.slug)
  if (!newsId) return NextResponse.json({ error: st('err.newsNotFound') }, { status: 404 })

  const viewer = await getViewer()
  // Ambil komentar (terlama di atas) dan semua reaksi secara bersamaan
  const [commentsRes, reactionsRes] = await Promise.all([
    supabaseAdmin
      .from('news_comments')
      .select('id,author_name,author_type,body,created_at,user_id,visitor_key')
      .eq('news_id', newsId)
      .order('created_at', { ascending: true })
      .limit(500),
    supabaseAdmin.from('news_reactions').select('emoji,visitor_key').eq('news_id', newsId),
  ])

  // Hitung jumlah tiap emoji, dan catat emoji yang sudah diklik pengunjung ini
  const reactions: Record<string, number> = {}
  const mine: string[] = []
  for (const r of reactionsRes.data || []) {
    reactions[r.emoji] = (reactions[r.emoji] || 0) + 1
    if (r.visitor_key === viewer.reactionKey) mine.push(r.emoji)
  }

  const payload: InteractionsPayload = {
    comments: (commentsRes.data || []).map((row) => toPublicComment(row, viewer)),
    reactions,
    mine,
    user: viewer.user,
    isAdmin: viewer.isAdmin,
  }
  return NextResponse.json(payload)
}
