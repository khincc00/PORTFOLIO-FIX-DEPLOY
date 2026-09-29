import './globals.css'
import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'
import { PreferencesProvider, preferencesScript } from '@/components/Preferences'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: '%s | Khincc Studio' },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author, url: siteConfig.url }],
  creator: siteConfig.author,
  alternates: { canonical: '/' },
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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
}

// Structured data so Google can show the site name and link the social profiles
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
    // The head script sets data-theme / data-lang before hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
