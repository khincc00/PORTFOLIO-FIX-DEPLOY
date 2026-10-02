/**
 * app/api/admin/data/route.ts → GET /api/admin/data
 * Data untuk Dashboard admin: pesan dari form kontak dan daftar karya dari tabel LAMA `portfolio`.
 * Catatan: tabel lama ini sudah tidak dipakai beranda. Karya sekarang diatur di menu Portfolio
 * (tabel portfolio_items).
 */
import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { portfolioSeed } from '@/lib/portfolio-data'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!(await isAdminRequest())) return unauthorized()

    // Nilai awal: data bawaan di kode, dipakai kalau database tidak bisa diakses
    let portfolioList = portfolioSeed
    let contactList: any[] = []
    let dbError: string | null = null

    if (isSupabaseConfigured) {
      // Pesan kontak hanya bisa dibaca dengan kunci admin (dilindungi RLS).
      // Kalau kunci admin belum ada, pakai kunci publik (hanya portfolio yang terbaca)
      const db = isAdminDbConfigured ? supabaseAdmin : supabase
      try {
        const [portfolioRes, contactsRes] = await Promise.all([
          db.from('portfolio').select('*').order('id', { ascending: true }),
          db.from('contacts').select('*').order('created_at', { ascending: false }),
        ])

        if (portfolioRes.error) {
          dbError = portfolioRes.error.message
        } else if (portfolioRes.data && portfolioRes.data.length > 0) {
          portfolioList = portfolioRes.data
        }

        if (contactsRes.data) {
          contactList = contactsRes.data
        }
      } catch (e: any) {
        dbError = e.message || 'Gagal memuat data dari Supabase'
      }
    }

    return NextResponse.json({
      portfolioList,
      contactList,
      dbError,
      isSupabaseConfigured,
      isAdminDbConfigured,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
