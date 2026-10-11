/**
 * app/api/admin/games/route.ts → /api/admin/games
 * GET: semua game untuk menu Admin → Games. POST: tambah game baru (di urutan paling bawah).
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { gameSlug, parseGameInput } from '@/lib/games'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

const MISSING_GAMES_TABLE_MESSAGE =
  'Tabel games belum dibuat. Jalankan supabase/migrations/20261011_games.sql di SQL Editor Supabase.'

// Semua game (termasuk yang disembunyikan), urut sesuai posisi
export async function GET() {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin.from('games').select('*').order('position').order('id')
  if (error) {
    const missing = error.code === '42P01' || /does not exist|schema cache/i.test(error.message)
    return NextResponse.json({ error: missing ? MISSING_GAMES_TABLE_MESSAGE : error.message }, { status: missing ? 409 : 500 })
  }
  return NextResponse.json(data)
}

// Tambah game baru di urutan paling bawah
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const parsed = parseGameInput(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const slug = gameSlug(parsed.value.title)
  if (!slug) return NextResponse.json({ error: 'Nama game harus memuat huruf atau angka.' }, { status: 400 })

  const { data: last } = await supabaseAdmin
    .from('games')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('games')
    .insert({ ...parsed.value, slug, position: (last?.position ?? -1) + 1 })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Nama ini menghasilkan alamat yang sudah dipakai game lain. Ubah sedikit namanya.' }, { status: 409 })
    if (error.code === '42P01') return NextResponse.json({ error: MISSING_GAMES_TABLE_MESSAGE }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
