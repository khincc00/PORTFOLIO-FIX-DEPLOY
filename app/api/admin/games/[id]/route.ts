/**
 * app/api/admin/games/[id]/route.ts → /api/admin/games/<id>
 * PUT: simpan perubahan satu game (alamat/slug tidak berubah). DELETE: hapus game.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { parseGameInput } from '@/lib/games'

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
  if (!id) return NextResponse.json({ error: 'ID game tidak valid.' }, { status: 400 })

  const parsed = parseGameInput(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('games')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })
  const id = await parseId(params)
  if (!id) return NextResponse.json({ error: 'ID game tidak valid.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('games').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
