/**
 * app/berita/[slug]/page.tsx → halaman SATU BERITA (contoh /berita/judul-berita)
 * [slug] di nama folder artinya bagian URL ini berubah-ubah sesuai berita yang dibuka.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getNewsBySlug } from '@/lib/news-public'
import { readingTime } from '@/lib/news'
import SiteHeader from '@/components/SiteHeader'
import { LocalDate, T } from '@/components/Preferences'
import { siteConfig } from '@/lib/site'
import NewsInteractions from './NewsInteractions'

// Cache halaman, dibuat ulang paling lama tiap 60 detik
export const revalidate = 60

type Props = { params: { slug: string } }

// Judul, deskripsi, dan gambar preview berbeda untuk setiap berita (untuk Google & media sosial)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getNewsBySlug(params.slug)
  if (!post) return { title: 'News not found' }
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
  if (!post) notFound() // berita tidak ada / belum terbit → tampilkan halaman 404

  // Data terstruktur NewsArticle supaya Google mengenali halaman ini sebagai artikel berita
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
      <SiteHeader />

      {/* replace(/</g, ...) mencegah isi berita "keluar" dari tag <script> */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <article className="news-article">
        <Link href="/berita" className="text-link news-back"><T k="news.back" /></Link>
        <div className="news-meta"><span>{post.category}</span><span><LocalDate iso={post.published_at} /></span><span>{readingTime(post.content)} <T k="news.minRead" /></span></div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="news-lede">{post.excerpt}</p>}
        {post.cover_image && <img className="news-article-cover" src={post.cover_image} alt="" />}
        {/* Isi berita (HTML) sudah dibersihkan saat disimpan (lib/sanitize.ts), jadi aman ditampilkan */}
        <div className="news-body" dangerouslySetInnerHTML={{ __html: post.content }} />
        {post.tags && post.tags.length > 0 && (
          <div className="news-tags">{post.tags.map((t) => <span key={t}>#{t}</span>)}</div>
        )}
        {/* Reaksi emoji & komentar */}
        <NewsInteractions slug={post.slug} />
      </article>

      <footer className="studio-footer"><span><T k="footer.text" /></span></footer>
    </main>
  )
}
