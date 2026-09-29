import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedNews } from '@/lib/news-public'
import { formatNewsDate } from '@/lib/news'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Berita & Kabar Terbaru',
  description: 'Update terbaru, project, dan cerita di balik layar dari Khincc Studio.',
  alternates: { canonical: '/berita' },
  openGraph: { title: 'Berita & Kabar Terbaru | Khincc Studio', url: '/berita' },
}

export default async function NewsIndexPage() {
  const posts = await getPublishedNews()
  const [featured, ...rest] = posts

  return (
    <main className="studio">
      <nav className="studio-nav">
        <Link className="wordmark" href="/">KHINCC® / Studio</Link>
        <div className="nav-links"><Link href="/#works">Works</Link><Link href="/berita">News</Link><Link href="/#contact">Contact</Link></div>
        <Link className="nav-cta" href="/#contact">Hire Me</Link>
      </nav>

      <section className="news-page section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Journal / Berita & Kabar Terbaru</p>
          <h2>Notes from the studio.</h2>
          <p className="section-note">Update project, rilis konten baru, dan cerita di balik layar.</p>
        </div>

        {posts.length === 0 ? (
          <p className="news-empty">Belum ada berita yang diterbitkan. Nantikan kabar terbaru segera.</p>
        ) : (
          <>
            <Link href={`/berita/${featured.slug}`} className="news-featured">
              <div className="news-cover">{featured.cover_image ? <img src={featured.cover_image} alt="" /> : <span>{featured.category}</span>}</div>
              <div>
                <div className="news-meta"><span>{featured.category}</span><span>{formatNewsDate(featured.published_at)}</span></div>
                <h3>{featured.title}</h3>
                <p>{featured.excerpt}</p>
                <span className="text-link">Baca selengkapnya ↗</span>
              </div>
            </Link>

            {rest.length > 0 && (
              <div className="news-grid">
                {rest.map((post) => (
                  <Link key={post.id} href={`/berita/${post.slug}`} className="news-card">
                    <div className="news-cover">{post.cover_image ? <img src={post.cover_image} alt="" loading="lazy" /> : <span>{post.category}</span>}</div>
                    <div className="news-meta"><span>{post.category}</span><span>{formatNewsDate(post.published_at)}</span></div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="studio-footer"><span>© 2026 Khincc Studio • Indonesia • Made with intention.</span></footer>
    </main>
  )
}
