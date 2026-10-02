/**
 * app/api/news/[slug]/reactions/route.ts → POST /api/news/<slug>/reactions
 * Klik emoji sekali = memberi reaksi, klik lagi = membatalkan.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { findPublishedNewsId, getViewer, withVisitorCookie } from '@/lib/interactions-server'
import { REACTIONS } from '@/lib/interactions'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

// Beri / batalkan reaksi (toggle)
export async function POST(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: await st('err.disabled') }, { status: 503 })

  const { emoji } = await req.json().catch(() => ({}))
  // Hanya emoji yang ada di daftar REACTIONS yang diterima
  if (!REACTIONS.includes(emoji)) return NextResponse.json({ error: await st('err.reactionUnknown') }, { status: 400 })

  const newsId = await findPublishedNewsId((await params).slug)
  if (!newsId) return NextResponse.json({ error: await st('err.newsNotFound') }, { status: 404 })

  const viewer = await getViewer()
  // Satu reaksi dikenali dari: berita + emoji + siapa pemberinya
  const key = { news_id: newsId, emoji, visitor_key: viewer.reactionKey }

  // Coba hapus dulu. Kalau ada yang terhapus, artinya reaksi dibatalkan
  const { data: removed, error: deleteError } = await supabaseAdmin.from('news_reactions').delete().match(key).select()
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  let active = false
  // Kalau tidak ada yang terhapus, berarti belum pernah bereaksi → tambahkan.
  // 23505 (data kembar) diabaikan, misalnya kalau tombol terklik dua kali sangat cepat
  if (!removed?.length) {
    const { error } = await supabaseAdmin.from('news_reactions').insert(key)
    if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
    active = true
  }

  // Hitung jumlah terbaru emoji ini untuk ditampilkan
  const { count } = await supabaseAdmin
    .from('news_reactions')
    .select('emoji', { count: 'exact', head: true })
    .eq('news_id', newsId)
    .eq('emoji', emoji)

  return withVisitorCookie(NextResponse.json({ emoji, active, count: count || 0 }), viewer.visitor)
}
