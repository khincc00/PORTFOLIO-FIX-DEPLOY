/**
 * app/api/community/vote/route.ts → POST /api/community/vote
 * Body: { type: 'post' | 'comment', id, value: 1 | -1 | 0 }. 0 = batalkan vote.
 * Satu akun satu vote per target; skor dihitung otomatis oleh trigger database.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { crossSite, getCommunityViewer, jsonError } from '@/lib/community-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  const { user } = await getCommunityViewer()
  if (!user) return jsonError(await st('cm.err.login'), 401)

  const b = await req.json().catch(() => ({}))
  const type = b.type === 'comment' ? 'comment' : b.type === 'post' ? 'post' : null
  const id = Number(b.id)
  const value = Number(b.value)
  if (!type || !Number.isInteger(id) || id <= 0 || ![-1, 0, 1].includes(value)) return jsonError('Bad request', 400)

  const table = type === 'post' ? 'community_posts' : 'community_comments'
  const { data: target } = await supabaseAdmin.from(table).select('id').eq('id', id).maybeSingle()
  if (!target) return jsonError(await st('cm.err.notFound'), 404)

  const key = { user_id: user.id, target_type: type, target_id: id }
  const { error } = value === 0
    ? await supabaseAdmin.from('community_votes').delete().match(key)
    : await supabaseAdmin.from('community_votes').upsert({ ...key, value }, { onConflict: 'user_id,target_type,target_id' })
  if (error) return jsonError(await st('err.server'), 500)

  const { data: fresh } = await supabaseAdmin.from(table).select('score').eq('id', id).single()
  return NextResponse.json({ score: fresh?.score ?? 0, my_vote: value })
}
