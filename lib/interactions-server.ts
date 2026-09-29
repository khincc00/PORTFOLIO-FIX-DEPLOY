import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser, type SiteUser } from '@/lib/account'
import { isAdminRequest } from '@/lib/admin-auth'
import { VISITOR_COOKIE, getVisitorId, visitorCookieOptions } from '@/lib/user-auth'
import type { PublicComment } from '@/lib/interactions'

// Server-only helpers for comments & reactions

export async function findPublishedNewsId(slug: string) {
  const { data } = await supabaseAdmin
    .from('news')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  return data?.id as number | undefined
}

export async function getViewer() {
  const [user, isAdmin] = [await getCurrentUser(), isAdminRequest()]
  const visitor = getVisitorId()
  return {
    user,
    isAdmin,
    visitor,
    // Logged-in users react as themselves across devices; guests by browser cookie
    reactionKey: user ? `u:${user.id}` : `v:${visitor.id}`,
  }
}

/** Attach the anonymous visitor cookie when a new id was generated */
export function withVisitorCookie(res: NextResponse, visitor: { id: string; fresh: boolean }) {
  if (visitor.fresh) res.cookies.set(VISITOR_COOKIE, visitor.id, visitorCookieOptions)
  return res
}

export function toPublicComment(
  row: any,
  viewer: { user: SiteUser | null; isAdmin: boolean; visitor: { id: string } }
): PublicComment {
  const own = viewer.user ? row.user_id === viewer.user.id : !row.user_id && row.visitor_key === viewer.visitor.id
  return {
    id: row.id,
    author_name: row.author_name,
    author_type: row.author_type,
    body: row.body,
    created_at: row.created_at,
    can_delete: viewer.isAdmin || own,
  }
}
