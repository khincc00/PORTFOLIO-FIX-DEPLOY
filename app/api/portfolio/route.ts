import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { portfolioSeed } from '@/lib/portfolio-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(portfolioSeed)
  }

  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('is_published', true)
      .order('likes', { ascending: false })

    if (error || !data || data.length === 0) {
      return NextResponse.json(portfolioSeed)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(portfolioSeed)
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured yet. Please configure environment variables in Vercel.' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { data, error } = await supabase.from('portfolio').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
