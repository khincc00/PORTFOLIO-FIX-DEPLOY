/**
 * lib/products-server.ts
 * Mengambil produk yang sudah terbit untuk halaman publik /toko. Hanya untuk server.
 * Memakai kunci publik (anon) sehingga RLS tetap berlaku: produk draft tidak pernah terbaca.
 */
import { revalidatePath } from 'next/cache'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Product } from '@/lib/products'

export async function getPublishedProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'published')
    .order('position')
    .order('id')
  // Kalau tabel belum dibuat atau koneksi gagal, halaman tetap tampil tanpa produk (dicatat di log server)
  if (error) {
    console.error('Gagal membaca produk:', error.message)
    return []
  }
  return (data ?? []) as Product[]
}

export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !/^[a-z0-9-]+$/.test(slug)) return null
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) return null
  return (data as Product | null) ?? null
}

// Minta Next.js membuat ulang halaman toko setelah admin mengubah produk
export function revalidateStore() {
  revalidatePath('/toko', 'layout')
}
