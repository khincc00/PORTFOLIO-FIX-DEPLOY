/**
 * app/api/community/comments/route.ts → /api/community/comments
 * POST: tulis komentar atau balasan (anggota login). DELETE ?id=: hapus (pemilik atau admin).
 * Menghapus komentar ikut menghapus semua balasannya.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { getIpHash } from '@/lib/user-auth'
import { COMMUNITY_LIMITS as L, countLinks, tidyText } from '@/lib/community'
import { crossSite, getCommunityViewer, jsonError, recentActivity } from '@/lib/community-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  try {
    const viewer = await getCommunityViewer()
    if (!viewer.user) return jsonError(await st('cm.err.login'), 401)

    const b = await req.json()
    if (b.website) return NextResponse.json({ ok: true })

    const postId = Number(b.post_id)
    const parentId = b.parent_id == null ? null : Number(b.parent_id)
    const body = tidyText(String(b.body || ''))
    if (body.length < 1 || body.length > L.commentMax) return jsonError(await st('err.bodyLength', { min: 1, max: L.commentMax }), 400)
    if (countLinks(body) > L.maxLinks) return jsonError(await st('err.tooManyLinks', { max: L.maxLinks }), 400)

    const { data: post } = await supabaseAdmin.from('community_posts').select('id').eq('id', postId).maybeSingle()
    if (!post) return jsonError(await st('cm.err.notFound'), 404)
    if (parentId !== null) {
      // Balasan harus menempel pada komentar di kiriman yang sama
      const { data: parent } = await supabaseAdmin.from('community_comments').select('id').eq('id', parentId).eq('post_id', postId).maybeSingle()
      if (!parent) return jsonError(await st('cm.err.notFound'), 404)
    }

    if (!viewer.isAdmin) {
      const { count, lastAt } = await recentActivity('community_comments', viewer.user.id)
      if (count >= L.commentsPerHour) return jsonError(await st('cm.err.tooMany'), 429)
      if (Date.now() - lastAt < L.secondsBetweenComments * 1000) return jsonError(await st('err.slowDown'), 429)
    }

    const { data, error } = await supabaseAdmin
      .from('community_comments')
      .insert({ post_id: postId, parent_id: parentId, user_id: viewer.user.id, body, ip_hash: getIpHash() })
      .select('id,post_id,parent_id,body,score,created_at')
      .single()
    if (error) return jsonError(await st('err.server'), 500)

    return NextResponse.json({
      comment: {
        ...data,
        author: { display_name: viewer.user.display_name, username: viewer.user.username },
        my_vote: 0,
        can_delete: true,
      },
    })
  } catch {
    return jsonError(await st('err.server'), 500)
  }
}

export async function DELETE(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  const id = Number(new URL(req.url).searchParams.get('id'))
  const viewer = await getCommunityViewer()
  const { data: row } = await supabaseAdmin.from('community_comments').select('id,user_id').eq('id', id).maybeSingle()
  if (!row) return jsonError(await st('cm.err.notFound'), 404)
  if (!viewer.isAdmin && viewer.user?.id !== row.user_id) return jsonError(await st('err.cannotDelete'), 403)

  const { error } = await supabaseAdmin.from('community_comments').delete().eq('id', id)
  if (error) return jsonError(await st('err.server'), 500)
  return NextResponse.json({ ok: true })
}
