import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, project_type, budget, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Nama, email, dan pesan wajib diisi.' },
        { status: 400 }
      )
    }

    if (!isSupabaseConfigured) {
      // Graceful fallback when Supabase credentials aren't deployed yet
      return NextResponse.json({
        ok: true,
        data: {
          id: 0,
          name,
          email,
          project_type: project_type || 'Branding',
          budget: budget || '<500k',
          message,
          created_at: new Date().toISOString(),
        },
        notice: 'Supabase belum dikonfigurasi di environment Vercel.',
      })
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        email,
        project_type: project_type || 'Branding',
        budget: budget || '<500k',
        message,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
