-- ========================================================
-- Schema Database untuk Portfolio Khincc (Supabase)
-- Jalankan skrip ini di SQL Editor pada Supabase Dashboard
-- ========================================================

-- 1. Tabel Portfolio
create table if not exists public.portfolio (
  id serial primary key,
  title text not null,
  likes int default 0,
  reel_id text not null unique,
  category text,
  description text,
  views int default 0,
  is_published boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Tabel Contacts (Form Pertanyaan / Pesan Klien)
create table if not exists public.contacts (
  id serial primary key,
  name text not null,
  email text not null,
  project_type text default 'Branding',
  budget text default '<$500',
  message text not null,
  status text default 'new',
  created_at timestamp with time zone default now()
);

-- 3. Aktifkan Row Level Security (RLS)
alter table public.portfolio enable row level security;
alter table public.contacts enable row level security;

-- 4. Policy RLS untuk Tabel Portfolio:
-- Mengizinkan siapa saja (publik / anon key) untuk membaca karya yang dipublikasikan
drop policy if exists "Allow public read access to published portfolio" on public.portfolio;
create policy "Allow public read access to published portfolio"
  on public.portfolio
  for select
  using (is_published = true);

-- Mengizinkan service role / user terotentikasi mengelola portfolio
drop policy if exists "Allow authenticated full access to portfolio" on public.portfolio;
create policy "Allow authenticated full access to portfolio"
  on public.portfolio
  for all
  using (auth.role() = 'service_role' or auth.role() = 'authenticated');

-- 5. Policy RLS untuk Tabel Contacts:
-- Mengizinkan pengunjung publik (anon) mengirimkan pesan kontak melalui website
drop policy if exists "Allow public insert to contacts" on public.contacts;
create policy "Allow public insert to contacts"
  on public.contacts
  for insert
  with check (true);

-- Mengizinkan admin / service role untuk membaca semua pesan kontak yang masuk
drop policy if exists "Allow service role full access to contacts" on public.contacts;
create policy "Allow service role full access to contacts"
  on public.contacts
  for all
  using (auth.role() = 'service_role' or auth.role() = 'authenticated');

-- 6. Data Awal (Seed Data) Portfolio
insert into public.portfolio (title, likes, reel_id, category, description) values
('WYVERN PRO IEM Gaming', 18, 'DVQrHReEkg3', 'Gaming Audio', 'Top performer, hook step musuh'),
('Secondwave e1', 11, 'DVw6WtMk8-8', 'Audio Review', 'Budget high-end storytelling'),
('Fantech Groove ANC Zoro', 8, 'DbVXyg1JH2J', 'Earbuds ANC', 'One Piece + ANC demo'),
('Fantech Tanto Mouse Dock', 7, 'DbILo_CJg0i', 'Gaming Mouse', 'Triple-mode kompleks jadi simple'),
('Secondwave/KZ Audio Lanjutan', 7, 'DVRlxm-EzEw', 'Audio', 'Konsistensi niche'),
('Affordable Streaming Gear', 6, 'DYhtuV0PbHu', 'Setup', 'Personal proof'),
('KZ Castor Starter Guide', 4, 'DVXWNrekt6i', 'Starter', 'CTA TikTok Shop'),
('Dynamic Mic Filter Limiter', 4, 'DYyi95pSL3u', 'Educational', 'Depth knowledge'),
('Streaming Mic Setup', 4, 'DYjRUUEpzw8', 'Educational', 'Technique'),
('Budget Setup Under $50', 4, 'DZw_Sc5JGAP', 'Budget Guide', 'Affordable streaming setup guide'),
('PHOTOOLEX RGB Tube Light', 2, 'DW1qrfEvgvS', 'Lighting', 'Visual quality'),
('Fantech Groove Luffy', 2, 'DbJc1-5TAwx', 'Earbuds', 'Series One Piece'),
('2K Webcam Streaming', 1, 'DWKG07fzceT', 'Webcam', 'Streaming gear'),
('Fantech WGP-13S Gamepad', 1, 'DVEGq4SEshJ', 'Gamepad Promo', 'Sales urgency copy')
on conflict (reel_id) do nothing;
