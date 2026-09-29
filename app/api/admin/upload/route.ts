/**
 * app/api/admin/upload/route.ts → POST /api/admin/upload
 * Upload gambar dari admin (cover berita, gambar isi berita, gambar portfolio)
 * ke Supabase Storage (bucket "news-images"). Hasilnya: alamat publik gambar.
 */
import { NextResponse } from 'next/server'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'
import { supabaseAdmin, isAdminDbConfigured, adminDbMissingMessage } from '@/lib/supabase-admin'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

const BUCKET = 'news-images'
const MAX_BYTES = 4 * 1024 * 1024 // Vercel membatasi body request ±4.5MB
// Jenis file yang diterima → ekstensi file yang disimpan
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Upload gambar (cover / isi berita) ke Supabase Storage
export async function POST(req: Request) {
  // Tolak kalau bukan admin yang sudah login (401), atau kunci database admin belum diatur (503)
  if (!isAdminRequest()) return unauthorized()
  if (!isAdminDbConfigured) return NextResponse.json({ error: adminDbMissingMessage }, { status: 503 })

  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File gambar tidak ditemukan.' }, { status: 400 })
    }
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Format harus JPG, PNG, WEBP, atau GIF.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ukuran gambar maksimal 4MB.' }, { status: 400 })
    }

    // Nama file unik: <tahun>/<waktu>-<acak>.<ekstensi>, contoh 2026/1727600000000-x8k2qa.jpg
    const path = `${new Date().getFullYear()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Ambil alamat publik gambar untuk disimpan di berita/portfolio
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload gagal' }, { status: 500 })
  }
}
