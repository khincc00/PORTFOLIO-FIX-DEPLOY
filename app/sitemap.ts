import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { getPublishedNews } from '@/lib/news-public'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const news = await getPublishedNews(1000).catch(() => [])
  const latest = news[0]?.published_at ? new Date(news[0].published_at) : new Date()

  return [
    { url: siteConfig.url, lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/berita`, lastModified: latest, changeFrequency: 'daily', priority: 0.8 },
    ...news.map((post) => ({
      url: `${siteConfig.url}/berita/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
