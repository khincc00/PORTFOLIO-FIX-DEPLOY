/**
 * app/layout.tsx → KERANGKA UTAMA semua halaman website.
 *
 * Di Next.js, layout.tsx di folder app/ membungkus SEMUA halaman. Isinya:
 * - memuat CSS global (globals.css),
 * - pengaturan SEO bawaan (judul, deskripsi, preview saat dibagikan),
 * - data terstruktur (JSON-LD) untuk Google,
 * - script kecil yang menerapkan tema siang/malam sebelum halaman tampil,
 * - PreferencesProvider yang menyediakan bahasa & tema untuk semua komponen.
 * {children} = isi halaman yang sedang dibuka (beranda, /work, /berita, dll.).
 */
import './globals.css'
import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'
import { PreferencesProvider, preferencesScript } from '@/components/Preferences'

// Pengaturan SEO bawaan. Halaman lain bisa menimpanya dengan `metadata` sendiri
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  // %s diganti judul halaman, contoh halaman /work → "Work | Khincc Studio"
  title: { default: siteConfig.title, template: '%s | Khincc Studio' },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author, url: siteConfig.url }],
  creator: siteConfig.author,
  alternates: { canonical: '/' },
  // Open Graph = judul & deskripsi saat link dibagikan di media sosial
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['id_ID'],
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: { card: 'summary_large_image', title: siteConfig.title, description: siteConfig.description },
  // Izinkan Google mengindeks halaman dan menampilkan gambar preview besar
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
}

// Data terstruktur (schema.org) supaya Google tahu nama website ini dan
// menghubungkannya dengan akun media sosial milik orang yang sama
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      alternateName: ['Khincc', 'khinccofficial', 'Khincreator'],
      inLanguage: ['en', 'id'],
    },
    {
      '@type': 'Person',
      '@id': `${siteConfig.url}/#person`,
      name: siteConfig.author,
      alternateName: 'khinccofficial',
      url: siteConfig.url,
      email: `mailto:${siteConfig.email}`,
      jobTitle: 'Multimedia Designer — Campaign Design & Short-form Video',
      address: { '@type': 'PostalAddress', addressLocality: 'Sangatta', addressCountry: 'ID' },
      sameAs: siteConfig.sameAs,
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Script di <head> memasang data-theme / data-lang sebelum React aktif (lihat components/Preferences.tsx)
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>
        {/* Data JSON-LD untuk Google (tidak terlihat di halaman) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
