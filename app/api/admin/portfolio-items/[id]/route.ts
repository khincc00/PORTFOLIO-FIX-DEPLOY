/**
 * app/api/admin/portfolio-items/[id]/route.ts → /api/admin/portfolio-items/<id>
 * PUT: simpan perubahan satu karya (termasuk tombol Sembunyikan dan ★ Highlight). DELETE: hapus karya.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { buildPortfolioPayload, revalidatePortfolio } from '@/lib/portfolio-server'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// Perbarui karya
export async function PUT(req: Request, { params }: Params) {
  // Tolak kalau bukan admin (401) atau kunci database admin belum diatur (503)
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    // Validasi & rapikan isi form (lihat lib/portfolio-server.ts)
    const payload = buildPortfolioPayload(await req.json())
    const { data, error } = await supabaseAdmin
      .from('portfolio_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', Number(params.id))
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePortfolio() // perbarui cache beranda dan /work
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
