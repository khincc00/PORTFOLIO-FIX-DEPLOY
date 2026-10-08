-- Run once in Supabase SQL Editor. Tabel produk untuk halaman /toko (tahap 1: pesan lewat WhatsApp).
-- Publik hanya boleh MEMBACA produk yang sudah terbit. Menulis lewat server (API admin, service role).

create table if not exists public.products (
  id bigserial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text,
  price integer not null check (price >= 0), -- dalam rupiah, bilangan bulat
  image text,
  image_alt text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_position_idx on public.products (status, position);

alter table public.products enable row level security;

drop policy if exists "Public read published products" on public.products;
create policy "Public read published products"
  on public.products
  for select
  using (status = 'published');

-- Akses tabel: anon/authenticated hanya boleh SELECT (dibatasi RLS di atas), tidak boleh mengubah apa pun
grant select on public.products to anon, authenticated;
revoke insert, update, delete on public.products from anon, authenticated;
