import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getNewsBySlug } from '@/lib/news-public'
import { formatNewsDate, readingTime } from '@/lib/news'

export const revalidate = 60

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getNewsBySlug(params.slug)
  if (!post) return { title: 'Berita tidak ditemukan | Khincc Studio' }
  return {
    title: `${post.title} | Khincc Studio`,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const post = await getNewsBySlug(params.slug)
  if (!post) notFound()

  return (
    <main className="studio">
      <nav className="studio-nav">
        <Link className="wordmark" href="/">KHINCC® / Studio</Link>
        <div className="nav-links"><Link href="/#works">Works</Link><Link href="/berita">News</Link><Link href="/#contact">Contact</Link></div>
        <Link className="nav-cta" href="/#contact">Hire Me</Link>
      </nav>

      <article className="news-article">
        <Link href="/berita" className="text-link news-back">← Semua berita</Link>
        <div className="news-meta"><span>{post.category}</span><span>{formatNewsDate(post.published_at)}</span><span>{readingTime(post.content)} menit baca</span></div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="news-lede">{post.excerpt}</p>}
        {post.cover_image && <img className="news-article-cover" src={post.cover_image} alt="" />}
        {/* Content is sanitized with an allowlist when saved (lib/sanitize.ts) */}
        <div className="news-body" dangerouslySetInnerHTML={{ __html: post.content }} />
        {post.tags && post.tags.length > 0 && (
          <div className="news-tags">{post.tags.map((t) => <span key={t}>#{t}</span>)}</div>
        )}
      </article>

      <footer className="studio-footer"><span>© 2026 Khincc Studio • Indonesia • Made with intention.</span></footer>
    </main>
  )
}
