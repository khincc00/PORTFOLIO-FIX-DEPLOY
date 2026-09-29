import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { buildNewsPayload, uniqueSlug, revalidateNews } from '@/lib/news-admin'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// Perbarui berita
export async function PUT(req: Request, { params }: Params) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const id = Number(params.id)
    const { data: existing } = await supabaseAdmin.from('news').select('slug').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Berita tidak ditemukan.' }, { status: 404 })

    const payload = buildNewsPayload(await req.json())
    payload.slug = await uniqueSlug(payload.slug, id)

    const { data, error } = await supabaseAdmin.from('news').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidateNews(existing.slug)
    revalidateNews(data.slug)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 400 })
  }
}

// Hapus berita
export async function DELETE(_req: Request, { params }: Params) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin
    .from('news')
    .delete()
    .eq('id', Number(params.id))
    .select('slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateNews(data?.slug)
  return NextResponse.json({ ok: true })
}
