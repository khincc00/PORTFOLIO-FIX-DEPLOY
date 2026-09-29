/**
 * app/api/admin/comments/[id]/route.ts → DELETE /api/admin/comments/<id>
 * Admin menghapus satu komentar dari menu Komentar. [id] di nama folder = bagian URL yang berubah-ubah.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

// Hapus komentar
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // Tolak kalau bukan admin yang sudah login (401), atau kunci database admin belum diatur (503)
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  const { error } = await supabaseAdmin.from('news_comments').delete().eq('id', Number(params.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
