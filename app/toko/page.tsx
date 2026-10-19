/**
 * app/toko/page.tsx → halaman TOKO (https://khincreator.com/toko)
 * Daftar produk yang sudah diterbitkan dari Studio → Toko.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import { formatRupiah } from '@/lib/invoice'
import { groupProductsByCategory, productHref, type Product } from '@/lib/products'
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

// Kartu produk: link ke TikTok Shop (dibuka di tab baru) kalau ada, selain itu ke halaman detail
function ProductCard({ product: p }: { product: Product }) {
  const affiliate = productHref(p)
  const thumb = (
    <div className="shop-thumb">
      {p.image && <img src={p.image} alt={p.image_alt || p.title} loading="lazy" />}
    </div>
  )
  const body = (
    <>
      <h3>{p.title}</h3>
      <p>{formatRupiah(p.price)}</p>
    </>
  )
  return (
    <li className="shop-card">
      {affiliate ? (
        <a href={affiliate} target="_blank" rel="sponsored noopener noreferrer">
          {thumb}
          {body}
        </a>
      ) : (
        <Link href={`/toko/${p.slug}`}>
          {thumb}
          {body}
        </Link>
      )}
    </li>
  )
}

// Ubah nama kelompok jadi id HTML yang aman, contoh "Headset & Earphone" → "headset-earphone"
const slugOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lainnya'

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
        groupProductsByCategory(products).map((group) => (
          <section className="shop-group" key={group.label} aria-labelledby={`shop-${slugOf(group.label)}`}>
            <h2 className="shop-group-title" id={`shop-${slugOf(group.label)}`}>
              {group.label}
            </h2>
            <ul className="shop-grid">
              {group.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
