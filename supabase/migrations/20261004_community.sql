-- Komunitas (gaya Reddit): kiriman, komentar bersarang, vote, laporan, dan catatan upload gambar.
-- Jalankan sekali di Supabase SQL Editor setelah schema.sql.
-- Semua akses lewat API server (service role); publik tidak punya akses langsung ke tabel.

-- 1. Bucket gambar komunitas (dibaca publik; upload hanya lewat server)
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do nothing;

-- 2. Kiriman (post)
create table if not exists public.community_posts (
  id serial primary key,
  user_id int not null references public.site_users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  body text not null default '' check (char_length(body) <= 5000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  score int not null default 0,          -- jumlah vote (diisi trigger)
  comment_count int not null default 0,  -- jumlah komentar (diisi trigger)
  ip_hash text,
  created_at timestamp with time zone not null default now()
);
create index if not exists community_posts_new_idx on public.community_posts (created_at desc);
create index if not exists community_posts_top_idx on public.community_posts (score desc, created_at desc);
create index if not exists community_posts_user_idx on public.community_posts (user_id, created_at);

-- 3. Komentar (bisa membalas komentar lain lewat parent_id)
create table if not exists public.community_comments (
  id serial primary key,
  post_id int not null references public.community_posts (id) on delete cascade,
  parent_id int references public.community_comments (id) on delete cascade,
  user_id int not null references public.site_users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  score int not null default 0,
  ip_hash text,
  created_at timestamp with time zone not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_user_idx on public.community_comments (user_id, created_at);

-- 4. Vote: +1 (upvote) atau -1 (downvote), satu per akun per target
create table if not exists public.community_votes (
  user_id int not null references public.site_users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id int not null,
  value smallint not null check (value in (-1, 1)),
  primary key (user_id, target_type, target_id)
);

-- 5. Laporan dari anggota (dibaca admin)
create table if not exists public.community_reports (
  id serial primary key,
  user_id int not null references public.site_users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id int not null,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamp with time zone not null default now(),
  unique (user_id, target_type, target_id)
);

-- 6. Catatan gambar yang diupload (untuk batas upload dan memastikan gambar milik si pengirim)
create table if not exists public.community_uploads (
  path text primary key,
  user_id int not null references public.site_users (id) on delete cascade,
  used boolean not null default false,
  created_at timestamp with time zone not null default now()
);
create index if not exists community_uploads_user_idx on public.community_uploads (user_id, created_at);

-- 7. Trigger: skor mengikuti vote
create or replace function public.community_apply_vote() returns trigger
language plpgsql as $$
declare delta int; kind text; tid int;
begin
  if tg_op = 'INSERT' then delta := new.value; kind := new.target_type; tid := new.target_id;
  elsif tg_op = 'UPDATE' then delta := new.value - old.value; kind := new.target_type; tid := new.target_id;
  else delta := -old.value; kind := old.target_type; tid := old.target_id;
  end if;
  if kind = 'post' then update public.community_posts set score = score + delta where id = tid;
  else update public.community_comments set score = score + delta where id = tid;
  end if;
  return null;
end $$;
drop trigger if exists community_votes_score on public.community_votes;
create trigger community_votes_score after insert or update or delete on public.community_votes
for each row execute function public.community_apply_vote();

-- 8. Trigger: jumlah komentar per kiriman
create or replace function public.community_count_comment() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  else update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists community_comments_count on public.community_comments;
create trigger community_comments_count after insert or delete on public.community_comments
for each row execute function public.community_count_comment();

-- 9. Trigger: bersihkan vote & laporan saat kiriman / komentar dihapus
create or replace function public.community_cleanup() returns trigger
language plpgsql as $$
declare kind text := tg_argv[0];
begin
  delete from public.community_votes where target_type = kind and target_id = old.id;
  delete from public.community_reports where target_type = kind and target_id = old.id;
  return null;
end $$;
drop trigger if exists community_posts_cleanup on public.community_posts;
create trigger community_posts_cleanup after delete on public.community_posts
for each row execute function public.community_cleanup('post');
drop trigger if exists community_comments_cleanup on public.community_comments;
create trigger community_comments_cleanup after delete on public.community_comments
for each row execute function public.community_cleanup('comment');

-- 10. Keamanan: RLS aktif tanpa policy (hanya service role / server yang bisa akses)
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_votes enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_uploads enable row level security;
revoke all on public.community_posts, public.community_comments, public.community_votes,
  public.community_reports, public.community_uploads from anon, authenticated;
