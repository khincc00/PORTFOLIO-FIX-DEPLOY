/**
 * app/toko/[slug]/page.tsx → detail satu produk (https://khincreator.com/toko/<slug>)
 * Tombol pesan membuka WhatsApp dengan nama dan harga produk sudah terisi.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'
import { siteConfig } from '@/lib/site'
import { formatRupiah } from '@/lib/invoice'
import { WHATSAPP_NUMBER, whatsappOrderUrl } from '@/lib/products'
import { getPublishedProductBySlug } from '@/lib/products-server'
import '../toko.css'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getPublishedProductBySlug((await params).slug)
  if (!product) return { title: 'Produk tidak ditemukan' }
  const description = product.description?.slice(0, 160) || `${product.title} — ${formatRupiah(product.price)}`
  return {
    title: product.title,
    description,
    alternates: { canonical: `/toko/${product.slug}` },
    openGraph: { title: `${product.title} | Khincc Studio`, description, url: `/toko/${product.slug}` },
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getPublishedProductBySlug((await params).slug)
  if (!product) notFound()

  // Kalau nomor WhatsApp belum diatur, pesanan dialihkan ke email
  const orderHref = WHATSAPP_NUMBER
    ? whatsappOrderUrl(WHATSAPP_NUMBER, product)
    : `mailto:${siteConfig.email}?subject=${encodeURIComponent(`Pesan: ${product.title}`)}`

  return (
    <main className="studio">
      <SiteHeader />

      <article className="shop-detail">
        <div>
          <div className="shop-detail-image">
            {product.image && <img src={product.image} alt={product.image_alt || product.title} />}
          </div>
        </div>

        <div>
          <Link className="shop-back" href="/toko">
            ← Kembali ke toko
          </Link>
          <h1>{product.title}</h1>
          <p className="shop-price">{formatRupiah(product.price)}</p>
          {product.description && <p className="shop-description">{product.description}</p>}
          <a className="shop-order" href={orderHref} target="_blank" rel="noreferrer">
            Pesan sekarang
          </a>
          <p className="shop-note">
            {WHATSAPP_NUMBER
              ? 'Pesanan dikonfirmasi lewat WhatsApp. Pembayaran dan pengiriman diatur bersama setelah pesanan dikonfirmasi.'
              : 'Pesanan dikonfirmasi lewat email. Pembayaran dan pengiriman diatur bersama setelah pesanan dikonfirmasi.'}
          </p>
        </div>
      </article>
    </main>
  )
}
