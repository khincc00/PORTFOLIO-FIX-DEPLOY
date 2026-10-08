/**
 * app/api/community/report/route.ts → POST /api/community/report
 * Anggota melaporkan kiriman / komentar. Laporan dibaca admin di menu Komunitas.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { COMMUNITY_LIMITS as L } from '@/lib/community'
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
  if (!type || !Number.isInteger(id) || id <= 0) return jsonError('Bad request', 400)

  const table = type === 'post' ? 'community_posts' : 'community_comments'
  const { data: target } = await supabaseAdmin.from(table).select('id').eq('id', id).maybeSingle()
  if (!target) return jsonError(await st('cm.err.notFound'), 404)

  const reason = String(b.reason || '').replace(/\s+/g, ' ').trim().slice(0, L.reportReasonMax)
  // 23505 = sudah pernah melapor target yang sama → dianggap berhasil
  const { error } = await supabaseAdmin.from('community_reports').insert({ user_id: user.id, target_type: type, target_id: id, reason })
  if (error && error.code !== '23505') return jsonError(await st('err.server'), 500)
  return NextResponse.json({ ok: true })
}
