import HomeClient from '@/components/HomeClient'
import { getPublishedPortfolio } from '@/lib/portfolio-server'
import { isFeatured, splitPortfolio, type PortfolioTotals } from '@/lib/portfolio-items'

export const revalidate = 300

export default async function Page() {
  const items = await getPublishedPortfolio()
  const totals = Object.fromEntries(
    Object.entries(splitPortfolio(items)).map(([k, list]) => [k, list.length])
  ) as PortfolioTotals
  return <HomeClient items={items.filter(isFeatured)} totals={totals} />
}
