/**
 * app/api/account/register/route.ts → POST /api/account/register
 * Daftar akun pengunjung baru: username + password (+ nama tampilan opsional), tanpa email.
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { isNameTakenByAccount } from '@/lib/account'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'
import {
  USER_COOKIE,
  USERNAME_PATTERN,
  createUserToken,
  getIpHash,
  hashPassword,
  isReservedName,
  normalizeName,
  userCookieOptions,
} from '@/lib/user-auth'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Batas anti-spam: maksimal 5 akun baru per jaringan internet (IP) per hari
const MAX_ACCOUNTS_PER_IP_PER_DAY = 5

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    // Nama tampilan boleh kosong → pakai username
    const displayName = normalizeName(String(body.display_name || '')) || username

    // --- Validasi input (kode 400 = permintaan tidak valid) ---
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: await st('err.usernameFormat') }, { status: 400 })
    }
    if (password.length < 8 || password.length > 100) {
      return NextResponse.json({ error: await st('err.passwordLength') }, { status: 400 })
    }
    if (displayName.length < 2 || displayName.length > 40) {
      return NextResponse.json({ error: await st('err.displayNameLength') }, { status: 400 })
    }
    if (isReservedName(username) || isReservedName(displayName)) {
      return NextResponse.json({ error: await st('err.nameReserved') }, { status: 400 })
    }

    // Nama tidak boleh sama dengan username/nama tampilan akun lain (kode 409 = bentrok)
    if ((await isNameTakenByAccount(displayName)) || (displayName !== username && (await isNameTakenByAccount(username)))) {
      return NextResponse.json({ error: await st('err.accountNameTaken') }, { status: 409 })
    }

    // Hitung akun yang dibuat dari IP ini dalam 24 jam terakhir (kode 429 = terlalu banyak permintaan)
    const ipHash = await getIpHash()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('site_users')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)
    if ((count || 0) >= MAX_ACCOUNTS_PER_IP_PER_DAY) {
      return NextResponse.json({ error: await st('err.tooManySignups') }, { status: 429 })
    }

    // Simpan akun baru. Password disimpan dalam bentuk hash, bukan aslinya
    const { data, error } = await supabaseAdmin
      .from('site_users')
      .insert({ username, display_name: displayName, password_hash: hashPassword(password), ip_hash: ipHash })
      .select('id,username,display_name')
      .single()

    if (error) {
      // 23505 = kode error Postgres untuk data unik yang sudah ada (username sudah dipakai)
      const taken = error.code === '23505'
      return NextResponse.json(
        { error: taken ? await st('err.usernameTaken') : error.message },
        { status: taken ? 409 : 500 }
      )
    }

    // Setelah daftar, pengunjung langsung dalam keadaan login
    const res = NextResponse.json({ user: data })
    res.cookies.set(USER_COOKIE, createUserToken(data.id), userCookieOptions)
    return res
  } catch {
    return NextResponse.json({ error: await st('err.server') }, { status: 500 })
  }
}
