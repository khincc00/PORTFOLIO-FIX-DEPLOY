/**
 * app/komunitas/[id]/page.tsx → halaman SATU KIRIMAN (contoh /komunitas/12)
 * Isi kiriman, gambar, vote, dan komentar bersarang.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import { T } from '@/components/Preferences'
import { isAdminDbConfigured } from '@/lib/supabase-admin'
import { getCommunityViewer, getPost, listComments } from '@/lib/community-server'
import AuthBox from '../AuthBox'
import Comments from '../Comments'
import PostActions from '../PostActions'
import TimeAgo from '../TimeAgo'
import Vote from '../Vote'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAdminDbConfigured) return { title: 'Community' }
  const post = await getPost(Number((await params).id), { user: null, isAdmin: false })
  if (!post) return { title: 'Post not found', robots: { index: false } }
  return {
    title: post.title,
    description: post.body.slice(0, 160) || undefined,
    alternates: { canonical: `/komunitas/${post.id}` },
  }
}

export default async function PostPage({ params }: Props) {
  if (!isAdminDbConfigured) notFound()
  const id = Number((await params).id)
  const viewer = await getCommunityViewer()
  const post = await getPost(id, viewer)
  if (!post) notFound()
  const comments = await listComments(id, viewer)

  return (
    <main className="studio">
      <SiteHeader />
      <article className="news-article cm-article">
        <Link href="/komunitas" className="news-back text-link"><T k="cm.back" /></Link>
        <div className="cm-post cm-post-full">
          <Vote type="post" id={post.id} score={post.score} myVote={post.my_vote} loggedIn={!!viewer.user} />
          <div className="cm-post-main">
            <div className="cm-meta"><T k="cm.by" /> <strong>{post.author.display_name}</strong> <em>@{post.author.username}</em> · <TimeAgo iso={post.created_at} /></div>
            <h1>{post.title}</h1>
            {post.body && <p className="cm-body">{post.body}</p>}
            {post.images.length > 0 && (
              <div className="cm-gallery">
                {post.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /></a>
                ))}
              </div>
            )}
            <div className="cm-foot">
              <PostActions type="post" id={post.id} canDelete={post.can_delete} loggedIn={!!viewer.user} redirectTo="/komunitas" />
            </div>
          </div>
        </div>

        {!viewer.user && <AuthBox user={null} />}
        <Comments postId={post.id} initial={comments} loggedIn={!!viewer.user} />
      </article>
      <footer className="studio-footer"><span><T k="footer.text" /></span></footer>
    </main>
  )
}
