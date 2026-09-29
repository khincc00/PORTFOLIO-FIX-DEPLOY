import type { Metadata } from 'next'
import WorkClient from './WorkClient'
import { getPublishedPortfolio } from '@/lib/portfolio-server'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Work',
  description: 'All campaign design, short-form video, YouTube and web projects by Taufiq Sholikhin for tech & gear brands and institutions.',
  alternates: { canonical: '/work' },
  openGraph: { title: 'Work | Khincc Studio', url: '/work' },
}

export default async function WorkPage() {
  return <WorkClient items={await getPublishedPortfolio()} />
}
