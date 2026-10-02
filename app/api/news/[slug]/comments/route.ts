/**
 * app/api/news/[slug]/comments/route.ts → /api/news/<slug>/comments
 * POST: kirim komentar. DELETE: hapus komentar (milik sendiri, atau semua kalau admin).
 */
import { NextResponse } from 'next/server'
import { st } from '@/lib/i18n-server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { findPublishedNewsId, getViewer, toPublicComment, withVisitorCookie } from '@/lib/interactions-server'
import { isNameTakenByAccount } from '@/lib/account'
import { getIpHash, isReservedName, normalizeName } from '@/lib/user-auth'
import { COMMENT_LIMITS } from '@/lib/interactions'

// Selalu dijalankan ulang di setiap permintaan (tidak disimpan di cache)
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

// Batas anti-spam: jeda minimal 20 detik antar komentar, maksimal 15 komentar per jam per IP
const MIN_SECONDS_BETWEEN_COMMENTS = 20
const MAX_COMMENTS_PER_HOUR = 15

// Kirim komentar (akun, tamu dengan nama bebas, atau admin sebagai penulis)
export async function POST(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: await st('err.disabled') }, { status: 503 })

  try {
    const body = await req.json()
    const viewer = await getViewer()

    // Honeypot (jebakan bot): kolom "website" disembunyikan dari pengunjung asli.
    // Kalau terisi, pasti bot → pura-pura berhasil tapi tidak disimpan
    if (body.website) return NextResponse.json({ ok: true })

    // Rapikan baris baru: maksimal satu baris kosong berturut-turut
    const text = String(body.body || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (text.length < COMMENT_LIMITS.bodyMin || text.length > COMMENT_LIMITS.bodyMax) {
      return NextResponse.json({ error: await st('err.bodyLength', { min: COMMENT_LIMITS.bodyMin, max: COMMENT_LIMITS.bodyMax }) }, { status: 400 })
    }
    // Hitung jumlah link di komentar (spam biasanya berisi banyak link)
    if ((text.match(/https?:\/\/|www\./gi) || []).length > COMMENT_LIMITS.maxLinks) {
      return NextResponse.json({ error: await st('err.tooManyLinks', { max: COMMENT_LIMITS.maxLinks }) }, { status: 400 })
    }

    // Tentukan penulis komentar: admin (sebagai penulis), anggota yang login, atau tamu
    let author: { author_name: string; author_type: 'guest' | 'member' | 'admin'; user_id: number | null }
    if (viewer.isAdmin && body.as_admin) {
      author = { author_name: 'Khincc', author_type: 'admin', user_id: null }
    } else if (viewer.user) {
      author = { author_name: viewer.user.display_name, author_type: 'member', user_id: viewer.user.id }
    } else {
      const name = normalizeName(String(body.name || ''))
      if (name.length < COMMENT_LIMITS.nameMin || name.length > COMMENT_LIMITS.nameMax) {
        return NextResponse.json({ error: await st('err.nameLength', { min: COMMENT_LIMITS.nameMin, max: COMMENT_LIMITS.nameMax }) }, { status: 400 })
      }
      if (isReservedName(name)) {
        return NextResponse.json({ error: await st('err.nameReserved') }, { status: 400 })
      }
      // Tamu tidak boleh memakai nama milik akun terdaftar
      if (await isNameTakenByAccount(name)) {
        return NextResponse.json({ error: await st('err.nameTaken') }, { status: 409 })
      }
      author = { author_name: name, author_type: 'guest', user_id: null }
    }

    const newsId = await findPublishedNewsId((await params).slug)
    if (!newsId) return NextResponse.json({ error: await st('err.newsNotFound') }, { status: 404 })

    // Cek batas spam berdasarkan IP (admin tidak dibatasi)
    const ipHash = await getIpHash()
    if (!viewer.isAdmin) {
      const { data: recent } = await supabaseAdmin
        .from('news_comments')
        .select('created_at')
        .eq('ip_hash', ipHash)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      if (recent && recent.length >= MAX_COMMENTS_PER_HOUR) {
        return NextResponse.json({ error: await st('err.tooManyComments') }, { status: 429 })
      }
      if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < MIN_SECONDS_BETWEEN_COMMENTS * 1000) {
        return NextResponse.json({ error: await st('err.slowDown') }, { status: 429 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('news_comments')
      .insert({ news_id: newsId, ...author, body: text, visitor_key: viewer.visitor.id, ip_hash: ipHash })
      .select('id,author_name,author_type,body,created_at,user_id,visitor_key')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Kirim komentar versi publik; pasang cookie tamu kalau baru pertama kali
    return withVisitorCookie(NextResponse.json({ comment: toPublicComment(data, viewer) }), viewer.visitor)
  } catch {
    return NextResponse.json({ error: await st('err.server') }, { status: 500 })
  }
}

// Hapus komentar sendiri (admin bisa menghapus semua)
export async function DELETE(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: await st('err.disabled') }, { status: 503 })

  // id komentar dikirim lewat URL, contoh ...?id=12
  const id = Number(new URL(req.url).searchParams.get('id'))
  const newsId = await findPublishedNewsId((await params).slug)
  if (!id || !newsId) return NextResponse.json({ error: await st('err.commentNotFound') }, { status: 404 })

  const viewer = await getViewer()
  const { data: row } = await supabaseAdmin
    .from('news_comments')
    .select('id,user_id,visitor_key')
    .eq('id', id)
    .eq('news_id', newsId)
    .maybeSingle()
  // Hanya pemilik komentar atau admin yang boleh menghapus (403 = dilarang)
  if (!row || !toPublicComment(row, viewer).can_delete) {
    return NextResponse.json({ error: await st('err.cannotDelete') }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('news_comments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
