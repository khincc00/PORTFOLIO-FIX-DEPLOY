import { NextResponse } from 'next/server'
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { findPublishedNewsId, getViewer, toPublicComment, withVisitorCookie } from '@/lib/interactions-server'
import { isNameTakenByAccount } from '@/lib/account'
import { getIpHash, isReservedName, normalizeName } from '@/lib/user-auth'
import { COMMENT_LIMITS } from '@/lib/interactions'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

const MIN_SECONDS_BETWEEN_COMMENTS = 20
const MAX_COMMENTS_PER_HOUR = 15

// Kirim komentar (akun, tamu dengan nama bebas, atau admin sebagai penulis)
export async function POST(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: 'Fitur komentar belum aktif.' }, { status: 503 })

  try {
    const body = await req.json()
    const viewer = await getViewer()

    // Honeypot: real visitors never see or fill this field
    if (body.website) return NextResponse.json({ ok: true })

    const text = String(body.body || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (text.length < COMMENT_LIMITS.bodyMin || text.length > COMMENT_LIMITS.bodyMax) {
      return NextResponse.json({ error: `Komentar ${COMMENT_LIMITS.bodyMin}–${COMMENT_LIMITS.bodyMax} karakter.` }, { status: 400 })
    }
    if ((text.match(/https?:\/\/|www\./gi) || []).length > COMMENT_LIMITS.maxLinks) {
      return NextResponse.json({ error: `Maksimal ${COMMENT_LIMITS.maxLinks} tautan per komentar.` }, { status: 400 })
    }

    let author: { author_name: string; author_type: 'guest' | 'member' | 'admin'; user_id: number | null }
    if (viewer.isAdmin && body.as_admin) {
      author = { author_name: 'Khincc', author_type: 'admin', user_id: null }
    } else if (viewer.user) {
      author = { author_name: viewer.user.display_name, author_type: 'member', user_id: viewer.user.id }
    } else {
      const name = normalizeName(String(body.name || ''))
      if (name.length < COMMENT_LIMITS.nameMin || name.length > COMMENT_LIMITS.nameMax) {
        return NextResponse.json({ error: `Nama ${COMMENT_LIMITS.nameMin}–${COMMENT_LIMITS.nameMax} karakter.` }, { status: 400 })
      }
      if (isReservedName(name)) {
        return NextResponse.json({ error: 'Nama tersebut tidak bisa dipakai. Silakan pilih nama lain.' }, { status: 400 })
      }
      // Guests can't borrow a name that belongs to a registered account
      if (await isNameTakenByAccount(name)) {
        return NextResponse.json({ error: 'Nama ini dipakai oleh akun terdaftar. Masuk ke akun tersebut atau pilih nama lain.' }, { status: 409 })
      }
      author = { author_name: name, author_type: 'guest', user_id: null }
    }

    const newsId = await findPublishedNewsId(params.slug)
    if (!newsId) return NextResponse.json({ error: 'Berita tidak ditemukan.' }, { status: 404 })

    const ipHash = getIpHash()
    if (!viewer.isAdmin) {
      const { data: recent } = await supabaseAdmin
        .from('news_comments')
        .select('created_at')
        .eq('ip_hash', ipHash)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      if (recent && recent.length >= MAX_COMMENTS_PER_HOUR) {
        return NextResponse.json({ error: 'Terlalu banyak komentar. Coba lagi nanti.' }, { status: 429 })
      }
      if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < MIN_SECONDS_BETWEEN_COMMENTS * 1000) {
        return NextResponse.json({ error: 'Tunggu sebentar sebelum mengirim komentar lagi.' }, { status: 429 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('news_comments')
      .insert({ news_id: newsId, ...author, body: text, visitor_key: viewer.visitor.id, ip_hash: ipHash })
      .select('id,author_name,author_type,body,created_at,user_id,visitor_key')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return withVisitorCookie(NextResponse.json({ comment: toPublicComment(data, viewer) }), viewer.visitor)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}

// Hapus komentar sendiri (admin bisa menghapus semua)
export async function DELETE(req: Request, { params }: Params) {
  if (!isAdminDbConfigured) return NextResponse.json({ error: 'Fitur komentar belum aktif.' }, { status: 503 })

  const id = Number(new URL(req.url).searchParams.get('id'))
  const newsId = await findPublishedNewsId(params.slug)
  if (!id || !newsId) return NextResponse.json({ error: 'Komentar tidak ditemukan.' }, { status: 404 })

  const viewer = await getViewer()
  const { data: row } = await supabaseAdmin
    .from('news_comments')
    .select('id,user_id,visitor_key')
    .eq('id', id)
    .eq('news_id', newsId)
    .maybeSingle()
  if (!row || !toPublicComment(row, viewer).can_delete) {
    return NextResponse.json({ error: 'Kamu tidak bisa menghapus komentar ini.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('news_comments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
