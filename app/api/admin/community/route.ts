/**
 * app/api/admin/community/route.ts → GET /api/admin/community
 * Daftar laporan komunitas (terbaru di atas) beserta cuplikan isinya, untuk menu Admin → Komunitas.
 * Menghapus konten memakai DELETE /api/community/posts atau /comments (admin boleh menghapus semua).
 * DELETE ?id= di sini menutup (membuang) satu laporan tanpa menghapus kontennya.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data: reports, error } = await supabaseAdmin
    .from('community_reports')
    .select('id,target_type,target_id,reason,created_at,reporter:site_users!user_id(username)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = reports || []
  const ids = (type: string) => rows.filter((r) => r.target_type === type).map((r) => r.target_id)
  const [posts, comments] = await Promise.all([
    ids('post').length ? supabaseAdmin.from('community_posts').select('id,title,body,author:site_users!user_id(username)').in('id', ids('post')) : { data: [] },
    ids('comment').length ? supabaseAdmin.from('community_comments').select('id,post_id,body,author:site_users!user_id(username)').in('id', ids('comment')) : { data: [] },
  ])
  const byId = (list: any[] | null) => new Map((list || []).map((x) => [x.id, x]))
  const postMap = byId(posts.data)
  const commentMap = byId(comments.data)

  return NextResponse.json(
    rows.map((r) => {
      const t: any = r.target_type === 'post' ? postMap.get(r.target_id) : commentMap.get(r.target_id)
      return {
        id: r.id,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        created_at: r.created_at,
        reporter: (r as any).reporter?.username || '?',
        author: t?.author?.username || '?',
        post_id: r.target_type === 'post' ? r.target_id : t?.post_id,
        excerpt: t ? String(t.title ? `${t.title} — ${t.body}` : t.body).slice(0, 240) : null,
      }
    })
  )
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })
  const id = Number(new URL(req.url).searchParams.get('id'))
  const { error } = await supabaseAdmin.from('community_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
