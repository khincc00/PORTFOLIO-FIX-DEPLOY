/**
 * app/api/portfolio/route.ts → /api/portfolio
 * API untuk tabel LAMA `portfolio` (sebelum ada menu Admin → Portfolio).
 * Catatan: beranda sudah tidak memakai API ini. Karya sekarang ada di tabel portfolio_items.
 */
import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { portfolioSeed } from '@/lib/portfolio-data'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// GET: daftar reel lama yang ditampilkan, urut dari likes terbanyak. Kalau gagal, pakai data bawaan
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(portfolioSeed)
  }

  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('is_published', true)
      .order('likes', { ascending: false })

    if (error || !data || data.length === 0) {
      return NextResponse.json(portfolioSeed)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(portfolioSeed)
  }
}

// POST: tambah data ke tabel lama. Hanya admin yang sudah login (menulis memakai kunci admin)
export async function POST(req: Request) {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diisi.' }, { status: 503 })
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured yet. Please configure environment variables in Vercel.' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin.from('portfolio').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
