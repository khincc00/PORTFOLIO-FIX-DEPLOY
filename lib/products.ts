/**
 * lib/products.ts
 * Tipe, validasi, dan tautan pemesanan untuk produk di /toko.
 * Aman dipakai di server maupun browser (tidak memakai kunci rahasia).
 */
import { formatRupiah } from '@/lib/invoice'

export type ProductStatus = 'draft' | 'published'

export type Product = {
  id: number
  slug: string
  title: string
  description: string | null
  price: number
  image: string | null
  image_alt: string | null
  status: ProductStatus
  position: number
  created_at: string
  updated_at: string
}

export type ProductInput = {
  slug: string
  title: string
  description: string
  price: number
  image: string
  image_alt: string
  status: ProductStatus
}

export const MAX_TITLE_LENGTH = 120
export const MAX_DESCRIPTION_LENGTH = 2000

// Ubah judul menjadi slug untuk alamat halaman, contoh "Preset Foto Gelap" → "preset-foto-gelap"
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Cek dan rapikan isi form dari admin. Mengembalikan pesan error yang bisa langsung ditampilkan.
export function parseProductInput(body: unknown): { ok: true; value: ProductInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Data produk tidak valid.' }
  const raw = body as Record<string, unknown>
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '')

  const title = text('title')
  if (!title) return { ok: false, error: 'Nama produk wajib diisi.' }
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: `Nama produk maksimal ${MAX_TITLE_LENGTH} karakter.` }

  const slug = text('slug') || slugify(title)
  if (!SLUG_PATTERN.test(slug)) return { ok: false, error: 'Alamat produk hanya boleh huruf kecil, angka, dan tanda hubung.' }

  const price = typeof raw.price === 'number' ? raw.price : Number(raw.price)
  if (!Number.isInteger(price) || price < 0) return { ok: false, error: 'Harga harus bilangan bulat, minimal 0.' }

  const description = text('description')
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return { ok: false, error: `Deskripsi maksimal ${MAX_DESCRIPTION_LENGTH} karakter.` }

  const image = text('image')
  if (image && !(image.startsWith('/') || image.startsWith('https://')))
    return { ok: false, error: 'Alamat gambar harus diawali / atau https://.' }

  const status = raw.status === 'published' ? 'published' : 'draft'

  return {
    ok: true,
    value: { slug, title, description, price, image, image_alt: text('image_alt'), status },
  }
}

// Tautan WhatsApp dengan pesan pemesanan yang sudah terisi nama dan harga produk.
// number = nomor internasional tanpa tanda + atau spasi, contoh 6281234567890
export function whatsappOrderUrl(number: string, product: Pick<Product, 'title' | 'price'>): string {
  const message = `Halo, saya ingin memesan "${product.title}" (${formatRupiah(product.price)}). Mohon info langkah pembayarannya.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '')
