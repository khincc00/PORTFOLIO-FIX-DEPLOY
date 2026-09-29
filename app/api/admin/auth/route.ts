import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  isAdminAuthConfigured,
  isAdminRequest,
  sessionCookieOptions,
  verifyCredentials,
} from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Cek apakah sesi admin masih aktif
export async function GET() {
  return NextResponse.json({ authenticated: isAdminRequest() })
}

// Login
export async function POST(req: Request) {
  try {
    if (!isAdminAuthConfigured) {
      return NextResponse.json(
        { error: 'ADMIN_USERNAME / ADMIN_PASSWORD belum diatur di environment server.' },
        { status: 503 }
      )
    }

    const { username, password } = await req.json()

    if (!verifyCredentials(String(username || ''), String(password || ''))) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions)
    return res
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}
