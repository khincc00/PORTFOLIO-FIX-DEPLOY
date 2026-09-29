import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Komentar terbaru dari semua berita untuk moderasi
export async function GET() {
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin
    .from('news_comments')
    .select('id,author_name,author_type,body,created_at,news:news_id(title,slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
