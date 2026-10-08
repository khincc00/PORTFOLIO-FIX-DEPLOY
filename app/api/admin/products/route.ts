/**
 * app/api/admin/products/route.ts → /api/admin/products
 * GET: semua produk untuk Studio → Toko. POST: tambah produk baru (draft atau terbit).
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { parseProductInput } from '@/lib/products'
import { revalidateStore } from '@/lib/products-server'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

const MISSING_TABLE_MESSAGE =
  'Tabel products belum dibuat. Jalankan supabase/migrations/20261008_products.sql di SQL Editor Supabase.'

// Semua produk (termasuk draft), urut sesuai posisi
export async function GET() {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin.from('products').select('*').order('position').order('id')
  if (error) {
    const missing = error.code === '42P01' || /does not exist|schema cache/i.test(error.message)
    return NextResponse.json({ error: missing ? MISSING_TABLE_MESSAGE : error.message }, { status: missing ? 409 : 500 })
  }
  return NextResponse.json(data)
}

// Tambah produk baru di urutan paling bawah
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const parsed = parseProductInput(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: last } = await supabaseAdmin
    .from('products')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ ...parsed.value, position: (last?.position ?? -1) + 1 })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Alamat (slug) ini sudah dipakai produk lain.' }, { status: 409 })
    if (error.code === '42P01') return NextResponse.json({ error: MISSING_TABLE_MESSAGE }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStore()
  return NextResponse.json(data)
}
