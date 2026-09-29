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

-- 7. Tabel News (Berita / Kabar Terbaru)
create table if not exists public.news (
  id serial primary key,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  cover_image text,
  category text default 'Update',
  tags text[] default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists news_status_published_at_idx
  on public.news (status, published_at desc);

alter table public.news enable row level security;

-- Pengunjung publik hanya bisa membaca berita yang sudah terbit
drop policy if exists "Allow public read access to published news" on public.news;
create policy "Allow public read access to published news"
  on public.news
  for select
  using (status = 'published' and published_at <= now());

-- Admin (lewat SUPABASE_SERVICE_ROLE_KEY di server) mengelola semua berita
drop policy if exists "Allow service role full access to news" on public.news;
create policy "Allow service role full access to news"
  on public.news
  for all
  using (auth.role() = 'service_role');

-- 8. Storage Bucket untuk gambar berita (dibaca publik, upload lewat server)
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- 9. Akun Pengunjung (untuk komentar; tanpa email, username + password)
create table if not exists public.site_users (
  id serial primary key,
  username text not null,
  display_name text not null,
  password_hash text not null,
  ip_hash text,
  created_at timestamp with time zone default now()
);
create unique index if not exists site_users_username_key on public.site_users (lower(username));

-- 10. Komentar Berita (dari akun atau tamu dengan nama bebas)
create table if not exists public.news_comments (
  id serial primary key,
  news_id int not null references public.news (id) on delete cascade,
  user_id int references public.site_users (id) on delete set null,
  author_name text not null,
  author_type text not null default 'guest' check (author_type in ('guest', 'member', 'admin')),
  body text not null,
  visitor_key text,
  ip_hash text,
  created_at timestamp with time zone default now()
);
create index if not exists news_comments_news_id_idx on public.news_comments (news_id, created_at);
create index if not exists news_comments_ip_hash_idx on public.news_comments (ip_hash, created_at);

-- 11. Reaksi Berita (satu reaksi per emoji per pengunjung)
create table if not exists public.news_reactions (
  news_id int not null references public.news (id) on delete cascade,
  emoji text not null,
  visitor_key text not null,
  created_at timestamp with time zone default now(),
  primary key (news_id, emoji, visitor_key)
);

-- Semua akses lewat API server (service role); tidak ada akses langsung dari publik
alter table public.site_users enable row level security;
alter table public.news_comments enable row level security;
alter table public.news_reactions enable row level security;
