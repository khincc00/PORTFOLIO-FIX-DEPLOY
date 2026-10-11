-- Run once in Supabase SQL Editor (atau lewat workflow "Supabase setup"). Katalog game browser untuk halaman /games.
-- Publik hanya boleh MEMBACA game yang ditampilkan. Menulis lewat server (API admin, service role).

create table if not exists public.games (
  id bigserial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- dipakai di tautan ?game=<slug>
  title text not null,
  stack text,
  description text,
  image text,
  play_url text not null,        -- "main": alamat yang dibuka di pemutar
  official_url text not null,    -- "official": situs resmi game
  official_label text,           -- teks tombol official, kosong = nama domain
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_published_position_idx on public.games (is_published, position);

alter table public.games enable row level security;

drop policy if exists "Public read published games" on public.games;
create policy "Public read published games"
  on public.games
  for select
  using (is_published);

-- Akses tabel: anon/authenticated hanya boleh SELECT (dibatasi RLS di atas), tidak boleh mengubah apa pun
grant select on public.games to anon, authenticated;
revoke insert, update, delete on public.games from anon, authenticated;

-- Isi awal: game yang sebelumnya ditulis langsung di public/games/index.html
insert into public.games (slug, title, stack, description, image, play_url, official_url, official_label, is_published, position)
values (
  'codequest',
  'CodeQuest — Small Studio',
  'HTML · CSS · JavaScript',
  'A browser game that teaches HTML, CSS and JavaScript through real client briefs. It runs your code and checks the website you built, with no quizzes.',
  '/work/codequest.jpg',
  'https://main.codequest.gamer.free/',
  'https://khincc.itch.io/codequest-small-studio',
  'itch.io',
  true,
  0
)
on conflict (slug) do nothing;

insert into public.games (slug, title, stack, description, image, play_url, official_url, official_label, is_published, position)
values (
  'bo1-zombies',
  'Black Ops Zombies',
  'FPS · Zombies',
  'All ten Black Ops 1 zombies maps in your browser, from Kino der Toten to Moon.',
  '/assets/games/bo1-zombies.jpg',
  'https://vel.gg/bo1z',
  'https://vel.gg/bo1z',
  'vel.gg',
  true,
  1
)
on conflict (slug) do nothing;
