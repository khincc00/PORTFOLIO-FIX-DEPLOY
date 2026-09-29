import { NextResponse } from 'next/server'
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

export const dynamic = 'force-dynamic'

const MAX_ACCOUNTS_PER_IP_PER_DAY = 5

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const displayName = normalizeName(String(body.display_name || '')) || username

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: 'Username 3–20 karakter: huruf, angka, titik, atau garis bawah.' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 100) {
      return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 })
    }
    if (displayName.length < 2 || displayName.length > 40) {
      return NextResponse.json({ error: 'Nama tampilan 2–40 karakter.' }, { status: 400 })
    }
    if (isReservedName(username) || isReservedName(displayName)) {
      return NextResponse.json({ error: 'Nama tersebut tidak bisa dipakai.' }, { status: 400 })
    }

    if ((await isNameTakenByAccount(displayName)) || (displayName !== username && (await isNameTakenByAccount(username)))) {
      return NextResponse.json({ error: 'Username atau nama tampilan sudah dipakai akun lain.' }, { status: 409 })
    }

    const ipHash = getIpHash()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('site_users')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)
    if ((count || 0) >= MAX_ACCOUNTS_PER_IP_PER_DAY) {
      return NextResponse.json({ error: 'Terlalu banyak pendaftaran. Coba lagi besok.' }, { status: 429 })
    }

    const { data, error } = await supabaseAdmin
      .from('site_users')
      .insert({ username, display_name: displayName, password_hash: hashPassword(password), ip_hash: ipHash })
      .select('id,username,display_name')
      .single()

    if (error) {
      const taken = error.code === '23505'
      return NextResponse.json(
        { error: taken ? 'Username sudah dipakai. Coba yang lain.' : error.message },
        { status: taken ? 409 : 500 }
      )
    }

    const res = NextResponse.json({ user: data })
    res.cookies.set(USER_COOKIE, createUserToken(data.id), userCookieOptions)
    return res
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
