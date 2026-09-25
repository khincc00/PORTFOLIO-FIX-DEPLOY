import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { portfolioSeed } from '@/lib/portfolio-data'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    const validPassword = process.env.ADMIN_PASSWORD || 'khincc2026'

    if (password !== validPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let portfolioList = portfolioSeed
    let contactList: any[] = []
    let dbError: string | null = null

    if (isSupabaseConfigured) {
      try {
        const [portfolioRes, contactsRes] = await Promise.all([
          supabase.from('portfolio').select('*').order('id', { ascending: true }),
          supabase.from('contacts').select('*').order('created_at', { ascending: false }),
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
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
