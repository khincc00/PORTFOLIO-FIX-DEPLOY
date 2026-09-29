import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedNews } from '@/lib/news-public'
import SiteHeader from '@/components/SiteHeader'
import { LocalDate, T } from '@/components/Preferences'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'News & Updates',
  description: 'Project updates, new releases, and behind-the-scenes stories from Khincc Studio.',
  alternates: { canonical: '/berita' },
  openGraph: { title: 'News & Updates | Khincc Studio', url: '/berita' },
}

export default async function NewsIndexPage() {
  const posts = await getPublishedNews()
  const [featured, ...rest] = posts

  return (
    <main className="studio">
      <SiteHeader />

      <section className="news-page section-wrap">
        <div className="section-heading">
          <p className="eyebrow"><T k="news.eyebrow" /></p>
          <h2><T k="news.title" /></h2>
          <p className="section-note"><T k="news.note" /></p>
        </div>

        {posts.length === 0 ? (
          <p className="news-empty"><T k="news.empty" /></p>
        ) : (
          <>
            <Link href={`/berita/${featured.slug}`} className="news-featured">
              <div className="news-cover">{featured.cover_image ? <img src={featured.cover_image} alt="" /> : <span>{featured.category}</span>}</div>
              <div>
                <div className="news-meta"><span>{featured.category}</span><span><LocalDate iso={featured.published_at} /></span></div>
                <h3>{featured.title}</h3>
                <p>{featured.excerpt}</p>
                <span className="text-link"><T k="news.readMore" /> ↗</span>
              </div>
            </Link>

            {rest.length > 0 && (
              <div className="news-grid">
                {rest.map((post) => (
                  <Link key={post.id} href={`/berita/${post.slug}`} className="news-card">
                    <div className="news-cover">{post.cover_image ? <img src={post.cover_image} alt="" loading="lazy" /> : <span>{post.category}</span>}</div>
                    <div className="news-meta"><span>{post.category}</span><span><LocalDate iso={post.published_at} /></span></div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="studio-footer"><span><T k="footer.text" /></span></footer>
    </main>
  )
}
