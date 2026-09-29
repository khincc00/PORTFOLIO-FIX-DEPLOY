/**
 * lib/site.ts
 * Identitas website untuk SEO: alamat, judul, deskripsi, dan kata kunci.
 *
 * Dipakai oleh app/layout.tsx (tag <title>, meta description, data JSON-LD untuk Google),
 * app/sitemap.ts, app/robots.ts, dan gambar preview (opengraph-image).
 * Ubah di sini kalau ingin mengganti judul atau deskripsi yang muncul di Google.
 */
import { contactInfo } from '@/lib/portfolio-data'

export const siteConfig = {
  url: 'https://khincreator.com', // alamat utama (tanpa www)
  name: 'Khincc Studio',
  author: 'Taufiq Sholikhin',
  // Judul yang muncul di tab browser dan hasil pencarian Google
  title: 'Taufiq Sholikhin — Campaign Design & Short-form Video for Tech & Gear Brands',
  // Deskripsi singkat di bawah judul pada hasil pencarian
  description:
    'Campaign design and short-form video for tech & gear brands. Taufiq Sholikhin (@khinccofficial) is a remote multimedia designer from Indonesia with 6+ years of experience, 50+ campaign assets for TNI AL, and work for Fantech, Secondwave, and KZ.',
  // Kata kunci pencarian yang relevan
  keywords: [
    'Taufiq Sholikhin',
    'khinccofficial',
    'Khincc Studio',
    'campaign design',
    'short-form video editor',
    'tech brand designer',
    'gear review video',
    'remote designer Indonesia',
    'video editor freelance',
    'graphic designer',
    'brand identity',
    'short-form video',
    'review gear streaming',
    'multimedia creator',
  ],
  // Akun media sosial resmi, supaya Google tahu semuanya milik orang yang sama
  sameAs: [contactInfo.links.instagram, contactInfo.links.tiktok, contactInfo.links.youtube],
  email: contactInfo.email,
}
