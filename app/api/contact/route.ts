/**
 * app/api/contact/route.ts → POST /api/contact
 * Menerima isi form kontak di beranda dan menyimpannya ke tabel `contacts`.
 * Pesan bisa dibaca di Dashboard admin, dan admin juga dikirimi notifikasi email (lib/notify-email.ts).
 */
import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { sendContactNotification } from '@/lib/notify-email'

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

    if (!isSupabaseConfigured || !isAdminDbConfigured) {
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

    // Simpan pesan lewat server (kunci admin). Publik tidak punya akses langsung ke tabel ini (RLS)
    const { data, error } = await supabaseAdmin
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

    // Kegagalan email tidak boleh menggagalkan form, karena pesan sudah tersimpan
    try {
      await sendContactNotification(data)
    } catch (e) {
      console.error('Gagal kirim notifikasi email:', e)
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
