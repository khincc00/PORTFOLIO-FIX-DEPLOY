import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { revalidatePortfolio } from '@/lib/portfolio-server'

export const dynamic = 'force-dynamic'

// Simpan urutan baru: { ids: [id paling atas, ..., id paling bawah] }
export async function POST(req: Request) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json({ error: 'Urutan tidak valid.' }, { status: 400 })
  }

  const results = await Promise.all(
    ids.map((id: number, position: number) => supabaseAdmin.from('portfolio_items').update({ position }).eq('id', id))
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  revalidatePortfolio()
  return NextResponse.json({ ok: true })
}
