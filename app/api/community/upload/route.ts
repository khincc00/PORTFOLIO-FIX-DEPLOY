/**
 * app/api/community/upload/route.ts → POST /api/community/upload
 * Upload SATU gambar untuk kiriman komunitas. Hanya anggota yang sudah login.
 * Gambar dicek dari isinya (bukan dari nama file), dibatasi ukuran dan jumlah per jam,
 * lalu dicatat di tabel community_uploads supaya hanya bisa dipakai oleh pengunggahnya.
 */
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import {
  COMMUNITY_BUCKET,
  COMMUNITY_LIMITS,
  crossSite,
  getCommunityViewer,
  jsonError,
  recentActivity,
  sniffImage,
} from '@/lib/community-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminDbConfigured) return jsonError(await st('err.disabled'), 503)
  if (crossSite(req)) return jsonError('Forbidden', 403)

  const { user } = await getCommunityViewer()
  if (!user) return jsonError(await st('cm.err.login'), 401)

  try {
    const file = (await req.formData()).get('file')
    if (!(file instanceof File)) return jsonError(await st('cm.err.imageMissing'), 400)
    if (file.size > COMMUNITY_LIMITS.imageBytes) return jsonError(await st('cm.err.imageSize'), 400)

    const { count } = await recentActivity('community_uploads', user.id)
    if (count >= COMMUNITY_LIMITS.uploadsPerHour) return jsonError(await st('cm.err.tooMany'), 429)

    const buf = Buffer.from(await file.arrayBuffer())
    const kind = sniffImage(buf)
    if (!kind) return jsonError(await st('cm.err.imageType'), 400)

    // Nama file acak di folder id pengguna, contoh 12/6f1c...-.jpg
    const path = `${user.id}/${randomUUID()}.${kind.ext}`
    const { error } = await supabaseAdmin.storage.from(COMMUNITY_BUCKET).upload(path, buf, { contentType: kind.mime })
    if (error) return jsonError(await st('err.server'), 500)

    const { error: logError } = await supabaseAdmin.from('community_uploads').insert({ path, user_id: user.id })
    if (logError) {
      await supabaseAdmin.storage.from(COMMUNITY_BUCKET).remove([path])
      return jsonError(await st('err.server'), 500)
    }
    return NextResponse.json({ url: supabaseAdmin.storage.from(COMMUNITY_BUCKET).getPublicUrl(path).data.publicUrl })
  } catch {
    return jsonError(await st('err.server'), 500)
  }
}
