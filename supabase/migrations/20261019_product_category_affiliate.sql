-- Kategori dan link afiliasi TikTok Shop untuk produk di /toko.
-- Jalankan sekali di Supabase SQL Editor SETELAH 20261008_products.sql.
-- Aman dijalankan ulang. Tidak mengubah policy RLS: publik tetap hanya bisa membaca produk terbit.

alter table public.products add column if not exists category text;
alter table public.products add column if not exists affiliate_url text;
