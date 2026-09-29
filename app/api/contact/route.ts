/**
 * app/api/contact/route.ts → POST /api/contact
 * Menerima isi form kontak di beranda dan menyimpannya ke tabel `contacts`.
 * Pesan bisa dibaca di Dashboard admin. Catatan: belum ada notifikasi email.
 */
import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, project_type, budget, message } = body

    // Nama, email, dan pesan wajib diisi
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Nama, email, dan pesan wajib diisi.' },
        { status: 400 }
      )
    }

    if (!isSupabaseConfigured) {
      // Kalau Supabase belum diatur, tetap jawab "berhasil" supaya form tidak error
      // (tapi pesan tidak tersimpan di mana pun)
      return NextResponse.json({
        ok: true,
        data: {
          id: 0,
          name,
          email,
          project_type: project_type || 'Branding',
          budget: budget || '<$500',
          message,
          created_at: new Date().toISOString(),
        },
        notice: 'Supabase belum dikonfigurasi di environment Vercel.',
      })
    }

    // Simpan pesan. Kunci publik boleh MENAMBAH pesan, tapi tidak boleh MEMBACA (diatur RLS)
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        email,
        project_type: project_type || 'Branding',
        budget: budget || '<$500',
        message,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
