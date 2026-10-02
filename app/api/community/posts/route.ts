/**
 * app/api/community/posts/route.ts → /api/community/posts
 * POST: buat kiriman baru (anggota login). DELETE ?id=: hapus kiriman (pemilik atau admin).
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { getIpHash } from '@/lib/user-auth'
import { COMMUNITY_LIMITS as L, countLinks, tidyText } from '@/lib/community'
import { crossSite, getCommunityViewer, jsonError, pathFromImageUrl, recentActivity, removeImages } from '@/lib/community-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  try {
    const viewer = await getCommunityViewer()
    const user = viewer.user
    if (!user) return jsonError(await st('cm.err.login'), 401)

    const b = await req.json()
    // Jebakan bot: kolom tersembunyi yang tidak pernah diisi manusia
    if (b.website) return NextResponse.json({ ok: true })

    const title = String(b.title || '').replace(/\s+/g, ' ').trim()
    const body = tidyText(String(b.body || ''))
    if (title.length < L.titleMin || title.length > L.titleMax) return jsonError(await st('cm.err.title', { min: L.titleMin, max: L.titleMax }), 400)
    if (body.length > L.bodyMax) return jsonError(await st('cm.err.body', { max: L.bodyMax }), 400)
    if (countLinks(`${title}\n${body}`) > L.maxLinks) return jsonError(await st('err.tooManyLinks', { max: L.maxLinks }), 400)

    // Gambar: hanya hasil upload SENDIRI yang belum dipakai kiriman lain
    const urls: string[] = Array.isArray(b.images) ? b.images.map(String).slice(0, L.maxImages + 1) : []
    if (urls.length > L.maxImages) return jsonError(await st('cm.err.imageCount', { max: L.maxImages }), 400)
    const paths = urls.map(pathFromImageUrl)
    if (paths.some((p) => !p) || new Set(paths).size !== paths.length) return jsonError(await st('cm.err.imageInvalid'), 400)
    if (paths.length) {
      const { data: owned } = await supabaseAdmin
        .from('community_uploads')
        .select('path')
        .eq('user_id', user.id)
        .eq('used', false)
        .in('path', paths as string[])
      if ((owned || []).length !== paths.length) return jsonError(await st('cm.err.imageInvalid'), 400)
    }

    // Batas spam per akun (admin tidak dibatasi)
    if (!viewer.isAdmin) {
      const { count, lastAt } = await recentActivity('community_posts', user.id)
      if (count >= L.postsPerHour) return jsonError(await st('cm.err.tooMany'), 429)
      if (Date.now() - lastAt < L.secondsBetweenPosts * 1000) return jsonError(await st('err.slowDown'), 429)
    }

    const { data, error } = await supabaseAdmin
      .from('community_posts')
      .insert({ user_id: user.id, title, body, images: urls, ip_hash: getIpHash() })
      .select('id')
      .single()
    if (error) return jsonError(await st('err.server'), 500)

    if (paths.length) await supabaseAdmin.from('community_uploads').update({ used: true }).in('path', paths as string[])
    return NextResponse.json({ id: data.id })
  } catch {
    return jsonError(await st('err.server'), 500)
  }
}

export async function DELETE(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  const id = Number(new URL(req.url).searchParams.get('id'))
  const viewer = await getCommunityViewer()
  const { data: post } = await supabaseAdmin.from('community_posts').select('id,user_id,images').eq('id', id).maybeSingle()
  if (!post) return jsonError(await st('cm.err.notFound'), 404)
  if (!viewer.isAdmin && viewer.user?.id !== post.user_id) return jsonError(await st('err.cannotDelete'), 403)

  const { error } = await supabaseAdmin.from('community_posts').delete().eq('id', id)
  if (error) return jsonError(await st('err.server'), 500)
  await removeImages(post.images || [])
  return NextResponse.json({ ok: true })
}
