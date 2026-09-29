import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getNewsBySlug } from '@/lib/news-public'
import { formatNewsDate, readingTime } from '@/lib/news'
import { siteConfig } from '@/lib/site'

export const revalidate = 60

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getNewsBySlug(params.slug)
  if (!post) return { title: 'Berita tidak ditemukan' }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    keywords: post.tags || undefined,
    alternates: { canonical: `/berita/${post.slug}` },
    openGraph: {
      url: `/berita/${post.slug}`,
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: [siteConfig.author],
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const post = await getNewsBySlug(params.slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image ? [post.cover_image] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: siteConfig.author, url: siteConfig.url },
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    mainEntityOfPage: `${siteConfig.url}/berita/${post.slug}`,
    keywords: post.tags?.join(', ') || undefined,
  }

  return (
    <main className="studio">
      <nav className="studio-nav">
        <Link className="wordmark" href="/">KHINCC® / Studio</Link>
        <div className="nav-links"><Link href="/#works">Works</Link><Link href="/berita">News</Link><Link href="/#contact">Contact</Link></div>
        <Link className="nav-cta" href="/#contact">Hire Me</Link>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
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
