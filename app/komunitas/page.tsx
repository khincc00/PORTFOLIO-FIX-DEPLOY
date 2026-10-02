/**
 * app/komunitas/page.tsx → halaman KOMUNITAS (https://khincreator.com/komunitas)
 * Daftar kiriman anggota (terbaru / terpopuler) + form membuat kiriman.
 * Server component: mengambil data (termasuk vote milik pengunjung) lalu menyerahkannya ke komponen browser.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import { T } from '@/components/Preferences'
import { isAdminDbConfigured } from '@/lib/supabase-admin'
import { parseSort, type PublicPost } from '@/lib/community'
import { getCommunityViewer, listPosts } from '@/lib/community-server'
import AuthBox from './AuthBox'
import Composer from './Composer'
import TimeAgo from './TimeAgo'
import Vote from './Vote'

// Isi berbeda untuk tiap pengunjung (vote, tombol hapus), jadi tidak boleh di-cache bersama
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community',
  description: 'Share work, ask questions, and talk with other creators. Post images and join the discussion.',
  alternates: { canonical: '/komunitas' },
  openGraph: { title: 'Community | Khincc Studio', url: '/komunitas' },
}

function PostRow({ post, loggedIn }: { post: PublicPost; loggedIn: boolean }) {
  return (
    <article className="cm-post">
      <Vote type="post" id={post.id} score={post.score} myVote={post.my_vote} loggedIn={loggedIn} />
      <div className="cm-post-main">
        <div className="cm-meta"><T k="cm.by" /> <strong>{post.author.display_name}</strong> · <TimeAgo iso={post.created_at} /></div>
        <h3><Link href={`/komunitas/${post.id}`}>{post.title}</Link></h3>
        {post.body && <p className="cm-snippet">{post.body}</p>}
        <div className="cm-foot">
          <Link href={`/komunitas/${post.id}`}>💬 {post.comment_count}</Link>
          {post.images.length > 0 && <span>🖼 {post.images.length}</span>}
        </div>
      </div>
      {post.images[0] && (
        <Link href={`/komunitas/${post.id}`} className="cm-post-thumb" tabIndex={-1} aria-hidden="true">
          <img src={post.images[0]} alt="" loading="lazy" referrerPolicy="no-referrer" />
        </Link>
      )}
    </article>
  )
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort = parseSort((await searchParams).sort)
  let posts: PublicPost[] = []
  let failed = false
  const viewer = await getCommunityViewer()
  if (isAdminDbConfigured) {
    try { posts = await listPosts(sort, viewer) } catch { failed = true }
  }

  return (
    <main className="studio">
      <SiteHeader />
      <section className="news-page section-wrap cm-page">
        <div className="section-heading">
          <p className="eyebrow"><T k="cm.eyebrow" /></p>
          <h2><T k="cm.title" /></h2>
          <p className="section-note"><T k="cm.note" /></p>
        </div>

        <div className="cm-layout">
          <div>
            <div className="cm-sorts" role="tablist">
              <Link href="/komunitas" role="tab" aria-selected={sort === 'new'} className={sort === 'new' ? 'is-active' : ''}><T k="cm.sortNew" /></Link>
              <Link href="/komunitas?sort=top" role="tab" aria-selected={sort === 'top'} className={sort === 'top' ? 'is-active' : ''}><T k="cm.sortTop" /></Link>
            </div>
            {failed || !isAdminDbConfigured ? (
              <p className="news-empty"><T k="cm.unavailable" /></p>
            ) : posts.length === 0 ? (
              <p className="news-empty"><T k="cm.empty" /></p>
            ) : (
              <div className="cm-list">{posts.map((p) => <PostRow key={p.id} post={p} loggedIn={!!viewer.user} />)}</div>
            )}
          </div>
          <aside className="cm-side">
            <AuthBox user={viewer.user} />
            {viewer.user && <Composer />}
          </aside>
        </div>
      </section>
      <footer className="studio-footer"><span><T k="footer.text" /></span></footer>
    </main>
  )
}
