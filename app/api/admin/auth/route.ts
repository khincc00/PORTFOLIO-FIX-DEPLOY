/**
 * app/api/admin/auth/route.ts → /api/admin/auth
 * GET: cek status login admin. POST: login admin. DELETE: logout admin.
 * Logika tanda tangan token ada di lib/admin-auth.ts.
 */
import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  isAdminAuthConfigured,
  isAdminRequest,
  sessionCookieOptions,
  verifyCredentials,
} from '@/lib/admin-auth'
import { clearFailures, lockedMessage, lockedSeconds, recordFailure } from '@/lib/rate-limit'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Cek apakah sesi admin masih aktif
export async function GET() {
  return NextResponse.json({ authenticated: await isAdminRequest() })
}

// Login: cocokkan username & password dengan Environment Variables, lalu pasang cookie sesi
export async function POST(req: Request) {
  try {
    if (!isAdminAuthConfigured) {
      return NextResponse.json(
        { error: 'ADMIN_USERNAME / ADMIN_PASSWORD belum diatur di environment server.' },
        { status: 503 }
      )
    }

    const { username, password } = await req.json()

    // Terkunci setelah 4 kali salah (kode 429 = terlalu banyak permintaan)
    const locked = await lockedSeconds('admin')
    if (locked) {
      return NextResponse.json(
        { error: lockedMessage(locked) },
        { status: 429, headers: { 'Retry-After': String(locked) } }
      )
    }

    if (!verifyCredentials(String(username || ''), String(password || ''))) {
      await recordFailure('admin')
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }
    await clearFailures('admin')

    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions)
    return res
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}

// Logout: hapus cookie sesi admin
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}
