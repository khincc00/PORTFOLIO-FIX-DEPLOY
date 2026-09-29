import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { buildNewsPayload, uniqueSlug, revalidateNews } from '@/lib/news-admin'

export const dynamic = 'force-dynamic'

// Semua berita (draft + terbit) untuk halaman admin
export async function GET() {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin
    .from('news')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Buat berita baru
export async function POST(req: Request) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const payload = buildNewsPayload(await req.json())
    payload.slug = await uniqueSlug(payload.slug)

    const { data, error } = await supabaseAdmin.from('news').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidateNews(data.slug)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 400 })
  }
}
