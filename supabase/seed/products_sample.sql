-- Contoh 1 produk untuk mencoba halaman /toko. Jalankan SETELAH supabase/migrations/20261008_products.sql.
-- Harga dan deskripsi hanya placeholder: ganti atau sembunyikan lewat Studio → Toko.
-- Aman dijalankan ulang (slug unik, tidak menimpa produk yang sudah ada).
insert into public.products (slug, title, description, price, image, image_alt, status, position)
values (
  'desain-logo',
  'Desain Logo',
  'Contoh produk untuk mencoba halaman toko. Ganti nama, harga, dan deskripsi ini di Studio → Toko.',
  500000,
  null,
  'Contoh produk desain logo',
  'published',
  0
)
on conflict (slug) do nothing;
