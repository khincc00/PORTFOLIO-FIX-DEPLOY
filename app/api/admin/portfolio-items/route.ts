import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { buildPortfolioPayload, revalidatePortfolio } from '@/lib/portfolio-server'

export const dynamic = 'force-dynamic'

// Semua karya (termasuk yang disembunyikan), urut per jenis
export async function GET() {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin.from('portfolio_items').select('*').order('kind').order('position')
  if (error) {
    const missing = error.code === '42P01' || /does not exist|schema cache/i.test(error.message)
    return NextResponse.json(
      { error: missing ? 'Tabel portfolio_items belum dibuat. Jalankan bagian 12 di supabase/schema.sql.' : error.message },
      { status: missing ? 409 : 500 }
    )
  }
  return NextResponse.json(data)
}

// Tambah karya baru di urutan paling bawah pada jenisnya
export async function POST(req: Request) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const payload = buildPortfolioPayload(await req.json())
    const { data: last } = await supabaseAdmin
      .from('portfolio_items')
      .select('position')
      .eq('kind', payload.kind)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabaseAdmin
      .from('portfolio_items')
      .insert({ ...payload, position: (last?.position ?? -1) + 1 })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePortfolio()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 400 })
  }
}
