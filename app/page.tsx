import HomeClient from '@/components/HomeClient'
import { getPublishedPortfolio } from '@/lib/portfolio-server'

// Portfolio edits from /admin revalidate this page immediately; this is a safety net
export const revalidate = 300

export default async function Page() {
  return <HomeClient items={await getPublishedPortfolio()} />
}
