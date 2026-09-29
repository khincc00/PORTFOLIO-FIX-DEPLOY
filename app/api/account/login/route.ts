/**
 * app/api/account/login/route.ts → POST /api/account/login
 * Login akun pengunjung (untuk berkomentar sebagai anggota).
 * Kalau berhasil, server memasang cookie khincc_user berisi token login.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import { USERNAME_PATTERN, USER_COOKIE, createUserToken, userCookieOptions, verifyPassword } from '@/lib/user-auth'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')

    // Format username tidak mungkin benar → langsung tolak tanpa bertanya ke database
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: st('err.badLogin') }, { status: 401 })
    }

    // Cari akun berdasarkan username (huruf besar/kecil dianggap sama)
    const { data: user } = await supabaseAdmin
      .from('site_users')
      .select('id,username,display_name,password_hash')
      .ilike('username', username.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle()

    // Pesan error sengaja sama untuk "akun tidak ada" dan "password salah",
    // supaya orang lain tidak bisa mengecek username mana yang terdaftar
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: st('err.badLogin') }, { status: 401 })
    }

    // Kirim data akun (tanpa hash password) dan pasang cookie login
    const res = NextResponse.json({ user: { id: user.id, username: user.username, display_name: user.display_name } })
    res.cookies.set(USER_COOKIE, createUserToken(user.id), userCookieOptions)
    return res
  } catch {
    return NextResponse.json({ error: st('err.server') }, { status: 500 })
  }
}
