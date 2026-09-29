import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { findPublishedNewsId, getViewer, withVisitorCookie } from '@/lib/interactions-server'
import { REACTIONS } from '@/lib/interactions'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

// Beri / batalkan reaksi (toggle)
export async function POST(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: st('err.disabled') }, { status: 503 })

  const { emoji } = await req.json().catch(() => ({}))
  if (!REACTIONS.includes(emoji)) return NextResponse.json({ error: st('err.reactionUnknown') }, { status: 400 })

  const newsId = await findPublishedNewsId(params.slug)
  if (!newsId) return NextResponse.json({ error: st('err.newsNotFound') }, { status: 404 })

  const viewer = await getViewer()
  const key = { news_id: newsId, emoji, visitor_key: viewer.reactionKey }

  const { data: removed, error: deleteError } = await supabaseAdmin.from('news_reactions').delete().match(key).select()
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  let active = false
  if (!removed?.length) {
    const { error } = await supabaseAdmin.from('news_reactions').insert(key)
    if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
    active = true
  }

  const { count } = await supabaseAdmin
    .from('news_reactions')
    .select('emoji', { count: 'exact', head: true })
    .eq('news_id', newsId)
    .eq('emoji', emoji)

  return withVisitorCookie(NextResponse.json({ emoji, active, count: count || 0 }), viewer.visitor)
}
