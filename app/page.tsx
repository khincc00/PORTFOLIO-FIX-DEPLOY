/**
 * app/page.tsx → halaman BERANDA (https://khincreator.com/)
 *
 * Di Next.js App Router, file bernama page.tsx di dalam folder app/ otomatis menjadi halaman.
 * File ini adalah "server component": berjalan di server untuk mengambil data portfolio
 * dari database, lalu menyerahkannya ke components/HomeClient.tsx yang menggambar tampilannya.
 */
import HomeClient from '@/components/HomeClient'
import { getPublishedPortfolio } from '@/lib/portfolio-server'
import { isFeatured, splitPortfolio, type PortfolioTotals } from '@/lib/portfolio-items'

// Halaman disimpan (cache) dan dibuat ulang paling lama tiap 300 detik (5 menit).
// Perubahan dari admin langsung terlihat karena admin memanggil revalidatePortfolio()
export const revalidate = 300

export default async function Page() {
  const items = await getPublishedPortfolio()
  // Hitung jumlah semua karya per bagian, untuk link "See all 14 →"
  const totals = Object.fromEntries(
    Object.entries(splitPortfolio(items)).map(([k, list]) => [k, list.length])
  ) as PortfolioTotals
  // Beranda hanya menerima karya yang di-highlight (★ di admin)
  return <HomeClient items={items.filter(isFeatured)} totals={totals} />
}
