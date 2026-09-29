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

-- 12. Portfolio Items (dikelola dari /admin → Portfolio: Design, Video, Web)
create table if not exists public.portfolio_items (
  id serial primary key,
  kind text not null check (kind in ('design', 'video', 'web')),
  title text not null,
  title_id text,
  subtitle text,
  description text,
  description_id text,
  tag text,
  tag_id text,
  year text,
  platform text check (platform in ('instagram', 'tiktok', 'youtube')),
  image text,
  image_alt text,
  link text,
  extra_links jsonb not null default '[]',
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists portfolio_items_kind_position_idx on public.portfolio_items (kind, position);

alter table public.portfolio_items enable row level security;

drop policy if exists "Allow public read access to published portfolio items" on public.portfolio_items;
create policy "Allow public read access to published portfolio items"
  on public.portfolio_items
  for select
  using (is_published = true);

-- Isi awal (hanya jika tabel masih kosong): karya yang sebelumnya tertanam di kode
insert into public.portfolio_items (kind, title, title_id, subtitle, description, description_id, tag, tag_id, year, platform, image, image_alt, link, extra_links, position, is_published)
select * from (values
  ('design', 'Online Loan Awareness', null, 'Campaign design / Social media', 'Campaign for Penerangan Lanal Sangatta — raising awareness of illegal online loans', 'Kampanye untuk Penerangan Lanal Sangatta — edukasi bahaya pinjol', null, null, '2026', null, null, 'Poster design about avoiding online loan scams for Penerangan Lanal Sangatta', null, '[]'::jsonb, 0, true),
  ('design', 'Digital Safety Campaign', null, 'Public information / Illustration', 'Educating the public on preventing fraud and exploitation on social media', 'Edukasi pencegahan penipuan dan eksploitasi di media sosial', null, null, '2026', null, null, 'Poster design about preventing fraud and exploitation on social media', null, '[]'::jsonb, 1, true),
  ('design', 'Responsible Conduct', null, 'Campaign design / Art direction', 'Campaign promoting responsible conduct and avoiding alcohol', 'Kampanye perilaku bertanggung jawab dan menghindari alkohol', null, null, '2026', null, null, 'Poster design promoting responsible behaviour and avoiding alcohol', null, '[]'::jsonb, 2, true),
  ('design', 'Fluent English', null, 'Education campaign / Poster design', 'Poster series for an English language course', 'Seri poster untuk kursus bahasa Inggris', null, null, '2026', null, null, 'Promotional poster design for Fluent English language courses', null, '[]'::jsonb, 3, true),
  ('design', 'Down Under Brew', null, 'Editorial infographic / Information design', 'Editorial infographic on Australian coffee production', 'Infografis editorial tentang produksi kopi Australia', null, null, '2026', null, null, 'Editorial infographic design about Australian coffee production', null, '[]'::jsonb, 4, true),
  ('video', 'WYVERN PRO IEM Gaming', null, null, 'Gaming IEM review with a hook-first edit for Reels', 'Review IEM gaming dengan editing hook-first untuk Reels', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DVQrHReEkg3/', '[]'::jsonb, 0, true),
  ('video', 'Secondwave e1', null, null, 'Budget earphone review told as a short story', 'Review earphone budget yang dikemas sebagai cerita singkat', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DVw6WtMk8-8/', '[]'::jsonb, 1, true),
  ('video', 'Fantech Groove ANC Zoro', null, null, 'One Piece edition earbuds for Fantech — ANC demo', 'Earbuds edisi One Piece dari Fantech — demo ANC', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DbVXyg1JH2J/', '[]'::jsonb, 2, true),
  ('video', 'Fantech Tanto Mouse Dock', null, null, 'A triple-mode wireless mouse explained in under a minute', 'Mouse wireless tiga mode dijelaskan dalam kurang dari semenit', 'Gaming gear', 'Gear gaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DbILo_CJg0i/', '[]'::jsonb, 3, true),
  ('video', 'Secondwave × KZ Follow-up', null, null, 'Follow-up audio review for Secondwave and KZ', 'Review audio lanjutan untuk Secondwave dan KZ', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DVRlxm-EzEw/', '[]'::jsonb, 4, true),
  ('video', 'Affordable Streaming Gear', null, null, 'My own streaming setup built from affordable gear', 'Setup streaming pribadi dari gear terjangkau', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DYhtuV0PbHu/', '[]'::jsonb, 5, true),
  ('video', 'KZ Castor Starter Guide', null, null, 'Starter guide for KZ Castor IEMs with a TikTok Shop call-to-action', 'Panduan pemula KZ Castor dengan ajakan belanja di TikTok Shop', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DVXWNrekt6i/', '[]'::jsonb, 6, true),
  ('video', 'Dynamic Mic Filter Limiter', null, null, 'Tutorial: taming a dynamic mic with filters and a limiter', 'Tutorial: mengatur mic dinamis dengan filter dan limiter', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DYyi95pSL3u/', '[]'::jsonb, 7, true),
  ('video', 'Streaming Mic Setup', null, null, 'Mic technique tips for streamers', 'Tips teknik mic untuk streamer', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DYjRUUEpzw8/', '[]'::jsonb, 8, true),
  ('video', 'Budget Setup Under Rp500k', null, null, 'A complete streaming setup for under Rp500k', 'Setup streaming lengkap di bawah Rp500 ribu', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DZw_Sc5JGAP/', '[]'::jsonb, 9, true),
  ('video', 'PHOTOOLEX RGB Tube Light', null, null, 'RGB tube light review focused on picture quality', 'Review lampu tube RGB dengan fokus kualitas gambar', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DW1qrfEvgvS/', '[]'::jsonb, 10, true),
  ('video', 'Fantech Groove Luffy', null, null, 'Luffy edition earbuds from the Fantech × One Piece series', 'Earbuds edisi Luffy dari seri Fantech × One Piece', 'Audio', 'Audio', null, 'instagram', null, null, 'https://www.instagram.com/reel/DbJc1-5TAwx/', '[]'::jsonb, 11, true),
  ('video', '2K Webcam Streaming', null, null, '2K webcam test for streaming', 'Uji webcam 2K untuk streaming', 'Streaming setup', 'Setup streaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DWKG07fzceT/', '[]'::jsonb, 12, true),
  ('video', 'Fantech WGP-13S Gamepad', null, null, 'Promo edit for the WGP-13S gamepad with urgency-led copy', 'Video promo gamepad WGP-13S dengan copy yang mendorong beli sekarang', 'Gaming gear', 'Gear gaming', null, 'instagram', null, null, 'https://www.instagram.com/reel/DVEGq4SEshJ/', '[]'::jsonb, 13, true),
  ('video', 'Short film for the 2023 Indonesian National Police anniversary', 'Film pendek untuk HUT Bhayangkara RI 2023', 'Short Movie "Scammer" HUT Bhayangkara RI 2023', null, null, 'Short film', 'Film pendek', null, 'youtube', null, 'Short film for the 2023 Indonesian National Police anniversary', 'https://www.youtube.com/watch?v=KrK69_zt3RM', '[]'::jsonb, 14, true),
  ('video', 'Documentary of the 2024 beret ceremony at SMK Negeri 2 Sangatta', 'Dokumentasi pembaretan SMK Negeri 2 Sangatta 2024', 'PEMBARETAN SMK NEGERI 2 SANGATTA URATA 2024', null, null, 'Documentary', 'Dokumenter', null, 'youtube', null, 'Documentary of the 2024 beret ceremony at SMK Negeri 2 Sangatta', 'https://www.youtube.com/watch?v=WXcYyiH0XIU', '[]'::jsonb, 15, true),
  ('video', 'Documentary of a mental & physical training course for PT KPC', 'Dokumenter kursus pembinaan mental & fisik PT KPC', 'SUS BINTALSIK PT. KPC', null, null, 'Documentary', 'Dokumenter', null, 'youtube', null, 'Documentary of a mental & physical training course for PT KPC', 'https://www.youtube.com/watch?v=xndoErqA96Y', '[]'::jsonb, 16, true),
  ('video', 'Budget webcam review', 'Review webcam murah', 'WEBCAM MURAH TAPI KEREN!', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'Budget webcam review', 'https://www.youtube.com/watch?v=N7fxwxRU23g', '[]'::jsonb, 17, true),
  ('video', '2K webcam review', 'Review webcam 2K', 'Webcam Eyd 2k Nih guys', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, '2K webcam review', 'https://www.youtube.com/watch?v=ua-SsfsolFQ', '[]'::jsonb, 18, true),
  ('video', 'Fantech Groove ANC earbuds review', 'Review earbuds Fantech Groove ANC', 'Fantech Groove ANC', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'Fantech Groove ANC earbuds review', 'https://www.youtube.com/watch?v=AN3x89Lz0EI', '[]'::jsonb, 19, true),
  ('video', 'Budget gamepad review', 'Review gamepad harga pelajar', 'Gamepad harga pelajar tapi speknya merusak pasar', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'Budget gamepad review', 'https://www.youtube.com/watch?v=B4l6aEvbMhg', '[]'::jsonb, 20, true),
  ('video', 'IEM picks for gaming', 'Rekomendasi IEM untuk gaming', 'Rekomendasi IEM buat gaming', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'IEM picks for gaming', 'https://www.youtube.com/watch?v=eRDN0xjid0w', '[]'::jsonb, 21, true),
  ('video', 'Best value-for-money lighting for creators', 'Lighting paling worth it untuk kreator', 'Lighting "Value for Money" Terbaik!', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'Best value-for-money lighting for creators', 'https://www.youtube.com/watch?v=hGFK8njoAhY', '[]'::jsonb, 22, true),
  ('video', 'HDMI capture card review', 'Review HDMI capture card', 'HDMI CAPTURE CARD', null, null, 'Gear review', 'Review perangkat', null, 'youtube', null, 'HDMI capture card review', 'https://www.youtube.com/watch?v=76VSMpFZWS0', '[]'::jsonb, 23, true),
  ('video', 'Fantech Groove ANC', null, null, 'Device review / Short-form editing', null, 'TikTok', null, null, 'tiktok', null, null, 'https://www.tiktok.com/@khinccofficial/video/7667530077298576660', '[]'::jsonb, 24, true),
  ('video', 'Fantech Tanto Mouse', null, null, 'Device review / Product editing', null, 'TikTok', null, null, 'tiktok', null, null, 'https://www.tiktok.com/@khinccofficial/video/7665426475558046997', '[]'::jsonb, 25, true),
  ('video', 'Plug and Play Microphone', null, null, 'Device review / Product editing', null, 'TikTok', null, null, 'tiktok', null, null, 'https://www.tiktok.com/@khinccofficial/video/7644066982530436372', '[]'::jsonb, 26, true),
  ('video', 'OBS Filter Setup', null, null, 'Streaming tutorial / Editing', null, 'TikTok', null, null, 'tiktok', null, null, 'https://www.tiktok.com/@khinccofficial/video/7631625360802712853', '[]'::jsonb, 27, true),
  ('web', 'CodeQuest — Small Studio', null, 'HTML · CSS · JavaScript', 'A browser game that teaches HTML, CSS and JavaScript through real client briefs. It runs your code and checks the website you built — no quizzes.', 'Game browser untuk belajar HTML, CSS, dan JavaScript lewat brief klien sungguhan. Game menjalankan kodemu dan memeriksa website yang kamu buat — tanpa kuis.', null, null, null, null, '/work/codequest.jpg', 'CodeQuest game scene: a cozy studio desk with a laptop showing code, a cat asleep by the lamp', 'https://main.codequest.gamer.free/', '[{"label":"itch.io","href":"https://khincc.itch.io/codequest-small-studio"},{"label":"GitHub","href":"https://github.com/khincc00/CodeQuest"}]'::jsonb, 0, true),
  ('web', 'khincreator.com', null, 'Next.js · TypeScript · Supabase', 'This portfolio: bilingual EN/ID, day/night mode, a news CMS with comments and reactions, and SEO — designed and built by me.', 'Portofolio ini: dua bahasa EN/ID, mode siang/malam, CMS berita dengan komentar dan reaksi, serta SEO — didesain dan dibangun sendiri.', null, null, null, null, '/work/khincreator.jpg', 'Homepage of khincreator.com in day mode', 'https://khincreator.com', '[{"label":"GitHub","href":"https://github.com/khincc00/PORTFOLIO-FIX-DEPLOY"}]'::jsonb, 1, true)
) as seed(kind, title, title_id, subtitle, description, description_id, tag, tag_id, year, platform, image, image_alt, link, extra_links, position, is_published)
where not exists (select 1 from public.portfolio_items);

-- ==========================================
-- 13. Portfolio highlight (homepage)
-- ==========================================
-- Homepage shows only highlighted items; the full list lives on /work.
alter table public.portfolio_items add column if not exists is_featured boolean not null default false;

-- Starting selection (same as DEFAULT_FEATURED in lib/portfolio-items.ts); runs only while nothing is highlighted yet
update public.portfolio_items set is_featured = true
where title in (
  'Online Loan Awareness', 'Digital Safety Campaign', 'Down Under Brew',
  'Fantech Groove ANC Zoro', 'Fantech Tanto Mouse Dock', 'WYVERN PRO IEM Gaming',
  'Fantech WGP-13S Gamepad', 'Secondwave e1', 'Budget Setup Under Rp500k',
  'Short film for the 2023 Indonesian National Police anniversary',
  'Documentary of a mental & physical training course for PT KPC',
  'Fantech Groove ANC earbuds review',
  'CodeQuest — Small Studio', 'khincreator.com'
)
and not exists (select 1 from public.portfolio_items where is_featured);
