/**
 * app/api/admin/products/[id]/route.ts → /api/admin/products/<id>
 * PUT: simpan perubahan satu produk. DELETE: hapus produk.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { parseProductInput } from '@/lib/products'
import { revalidateStore } from '@/lib/products-server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const parseId = async (params: Params['params']) => {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })
  const id = await parseId(params)
  if (!id) return NextResponse.json({ error: 'ID produk tidak valid.' }, { status: 400 })

  const parsed = parseProductInput(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Alamat (slug) ini sudah dipakai produk lain.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStore()
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })
  const id = await parseId(params)
  if (!id) return NextResponse.json({ error: 'ID produk tidak valid.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateStore()
  return NextResponse.json({ ok: true })
}
