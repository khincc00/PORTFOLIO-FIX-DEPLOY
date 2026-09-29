/**
 * app/work/page.tsx → halaman PORTOFOLIO LENGKAP (https://khincreator.com/work)
 * Server component: mengambil SEMUA karya yang ditampilkan, lalu digambar oleh WorkClient.tsx.
 */
import type { Metadata } from 'next'
import WorkClient from './WorkClient'
import { getPublishedPortfolio } from '@/lib/portfolio-server'

// Cache halaman, dibuat ulang paling lama tiap 5 menit
export const revalidate = 300

// Judul & deskripsi halaman ini untuk tab browser dan Google
export const metadata: Metadata = {
  title: 'Work',
  description: 'All campaign design, short-form video, YouTube and web projects by Taufiq Sholikhin for tech & gear brands and institutions.',
  alternates: { canonical: '/work' }, // alamat resmi halaman ini (mencegah duplikat di Google)
  openGraph: { title: 'Work | Khincc Studio', url: '/work' },
}

export default async function WorkPage() {
  return <WorkClient items={await getPublishedPortfolio()} />
}
