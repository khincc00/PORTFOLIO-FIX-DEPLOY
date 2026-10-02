/**
 * app/api/admin/comments/route.ts → GET /api/admin/comments
 * Daftar komentar terbaru dari semua berita untuk menu Komentar di admin.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Komentar terbaru dari semua berita untuk moderasi
export async function GET() {
  // Tolak kalau bukan admin yang sudah login (401), atau kunci database admin belum diatur (503)
  if (!(await isAdminRequest())) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { data, error } = await supabaseAdmin
    .from('news_comments')
    // news:news_id(title,slug) = ikut ambil judul & slug beritanya lewat relasi news_id
    .select('id,author_name,author_type,body,created_at,news:news_id(title,slug)')
    .order('created_at', { ascending: false })
    .limit(200) // maksimal 200 komentar terbaru

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
