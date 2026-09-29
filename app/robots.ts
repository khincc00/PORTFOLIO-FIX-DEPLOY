/**
 * app/robots.ts → menghasilkan https://khincreator.com/robots.txt
 * Aturan untuk robot mesin pencari (Google, Bing, dll.): halaman mana yang boleh dijelajahi.
 */
import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    // Semua robot boleh menjelajah, KECUALI halaman admin dan API
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/admin.php', '/api/'] },
    // Beri tahu lokasi sitemap (daftar semua halaman)
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
