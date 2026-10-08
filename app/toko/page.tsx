/**
 * app/toko/page.tsx → halaman TOKO (https://khincreator.com/toko)
 * Daftar produk yang sudah diterbitkan dari Studio → Toko.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import { formatRupiah } from '@/lib/invoice'
import { getPublishedProducts } from '@/lib/products-server'
import './toko.css'

// Cache halaman, dibuat ulang paling lama tiap 5 menit (admin juga memicu pembuatan ulang saat menyimpan)
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Products by Khincc Studio, ready to order.',
  alternates: { canonical: '/toko' },
  openGraph: { title: 'Shop | Khincc Studio', url: '/toko' },
}

export default async function ShopPage() {
  const products = await getPublishedProducts()

  return (
    <main className="studio">
      <SiteHeader />

      <section className="shop-head section-wrap">
        <p className="eyebrow">Shop</p>
        <h1>
          Produk<span>.</span>
        </h1>
        <p>Pilih produk, lalu pesan langsung lewat WhatsApp.</p>
      </section>

      {products.length === 0 ? (
        <p className="shop-empty">Belum ada produk. Silakan kembali lagi nanti.</p>
      ) : (
        <ul className="shop-grid">
          {products.map((p) => (
            <li className="shop-card" key={p.id}>
              <Link href={`/toko/${p.slug}`}>
                <div className="shop-thumb">
                  {p.image && <img src={p.image} alt={p.image_alt || p.title} loading="lazy" />}
                </div>
                <h2>{p.title}</h2>
                <p>{formatRupiah(p.price)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
