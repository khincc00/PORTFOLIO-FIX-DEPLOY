import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    const validPassword = process.env.ADMIN_PASSWORD || 'khincc2026'

    if (password === validPassword) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Password / PIN salah' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
