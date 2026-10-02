/**
 * app/api/admin/portfolio-items/reorder/route.ts → POST /api/admin/portfolio-items/reorder
 * Dipanggil saat admin menekan tombol ↑ atau ↓ di menu Portfolio.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { revalidatePortfolio } from '@/lib/portfolio-server'
import { trySyncPublishedContent } from '@/lib/github-sync'
export const maxDuration = 60

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Simpan urutan baru: { ids: [id paling atas, ..., id paling bawah] }
export async function POST(req: Request) {
  // Tolak kalau bukan admin yang sudah login (401), atau kunci database admin belum diatur (503)
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  // ids harus berupa daftar angka bulat
  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json({ error: 'Urutan tidak valid.' }, { status: 400 })
  }

  // Posisi setiap karya = urutannya di daftar (0, 1, 2, ...). Semua disimpan bersamaan
  const results = await Promise.all(
    ids.map((id: number, position: number) => supabaseAdmin.from('portfolio_items').update({ position }).eq('id', id))
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  revalidatePortfolio()
  await trySyncPublishedContent()
  return NextResponse.json({ ok: true })
}
