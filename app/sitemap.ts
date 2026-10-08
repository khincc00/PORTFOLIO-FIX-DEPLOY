/**
 * app/sitemap.ts → menghasilkan https://khincreator.com/sitemap.xml
 * Daftar semua halaman website untuk Google Search Console, termasuk setiap berita.
 */
import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { getPublishedNews } from '@/lib/news-public'

// Dibuat ulang paling lama tiap 1 jam (dan langsung saat berita diterbitkan)
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const news = await getPublishedNews(1000).catch(() => [])
  // Tanggal berita terbaru dipakai sebagai "terakhir diperbarui"
  const latest = news[0]?.published_at ? new Date(news[0].published_at) : new Date()

  return [
    // priority = seberapa penting halaman ini dibanding halaman lain (0–1)
    { url: siteConfig.url, lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/work`, lastModified: latest, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteConfig.url}/berita`, lastModified: latest, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteConfig.url}/komunitas`, lastModified: latest, changeFrequency: 'daily', priority: 0.6 },
    // Satu entri untuk setiap berita yang sudah terbit
    ...news.map((post) => ({
      url: `${siteConfig.url}/berita/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
