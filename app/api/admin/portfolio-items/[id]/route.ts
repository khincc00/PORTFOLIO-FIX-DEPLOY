import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { buildPortfolioPayload, revalidatePortfolio } from '@/lib/portfolio-server'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// Perbarui karya
export async function PUT(req: Request, { params }: Params) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const payload = buildPortfolioPayload(await req.json())
    const { data, error } = await supabaseAdmin
      .from('portfolio_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', Number(params.id))
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePortfolio()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 400 })
  }
}

// Hapus karya
export async function DELETE(_req: Request, { params }: Params) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { error } = await supabaseAdmin.from('portfolio_items').delete().eq('id', Number(params.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePortfolio()
  return NextResponse.json({ ok: true })
}
