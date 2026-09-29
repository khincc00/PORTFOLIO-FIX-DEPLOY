/**
 * app/api/account/route.ts → /api/account
 * GET: data akun pengunjung yang sedang login. DELETE: logout.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/account'
import { isAdminDbConfigured } from '@/lib/supabase-admin'
import { USER_COOKIE, userCookieOptions } from '@/lib/user-auth'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Akun pengunjung yang sedang login
export async function GET() {
  if (!isAdminDbConfigured) return NextResponse.json({ user: null })
  return NextResponse.json({ user: await getCurrentUser() })
}

// Logout: hapus cookie login dengan mengosongkan isinya dan membuatnya langsung kedaluwarsa
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(USER_COOKIE, '', { ...userCookieOptions, maxAge: 0 })
  return res
}
