-- SETUP KOMUNITAS (satu file): migrasi + isi contoh. Tempel semua di Supabase SQL Editor lalu klik Run. Aman diulang.

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

-- ====== ISI CONTOH (5 akun, 10 kiriman, komentar) ======
-- Isi contoh KOMUNITAS: 5 akun contoh, 10 kiriman tentang update game CodeQuest, komentar, dan vote.
-- Jalankan SETELAH supabase/migrations/20261004_community.sql. Aman dijalankan ulang (tidak menggandakan).
--
-- PENTING:
-- * Ini konten contoh buatan, bukan percakapan pengguna asli. Ubah teksnya sesuai update game yang sebenarnya,
--   atau hapus lewat Admin / halaman /komunitas kalau sudah tidak diperlukan.
-- * Kelima akun TIDAK bisa dipakai login (password_hash sengaja tidak valid), jadi tidak ada yang bisa mengambil alih.
-- * Hapus semuanya sekaligus dengan:
--     delete from public.site_users where username in ('rina_codes','bagas.dev','mei_pixel','dimas_ui','alya.html');

do $$
declare
  p int;
  c int;
begin
  if exists (select 1 from public.community_posts where title = 'Update terbaru CodeQuest: kesan pertama kalian?') then
    raise notice 'Isi contoh komunitas sudah ada, dilewati.';
    return;
  end if;

  -- 5 akun contoh. Hash "scrypt$x$x" tidak akan pernah cocok dengan password apa pun
  insert into public.site_users (username, display_name, password_hash) values
    ('rina_codes', 'Rina', 'scrypt$x$x'),
    ('bagas.dev',  'Bagas', 'scrypt$x$x'),
    ('mei_pixel',  'Mei', 'scrypt$x$x'),
    ('dimas_ui',   'Dimas', 'scrypt$x$x'),
    ('alya.html',  'Alya', 'scrypt$x$x')
  on conflict do nothing;

  -- Fungsi bantu sementara (hilang otomatis setelah sesi ini selesai)
  create function pg_temp.uid(name text) returns int language sql as
    $f$ select id from public.site_users where lower(username) = lower(name) $f$;
  create function pg_temp.post(author text, ttl text, txt text, ago interval) returns int language sql as
    $f$ insert into public.community_posts (user_id, title, body, created_at)
        values (pg_temp.uid(author), ttl, txt, now() - ago) returning id $f$;
  create function pg_temp.say(pid int, parent int, author text, txt text, ago interval) returns int language sql as
    $f$ insert into public.community_comments (post_id, parent_id, user_id, body, created_at)
        values (pid, parent, pg_temp.uid(author), txt, now() - ago) returning id $f$;

  -- 1
  p := pg_temp.post('rina_codes', 'Update terbaru CodeQuest: kesan pertama kalian?',
    E'Baru selesai coba update terbaru CodeQuest. Suasana studio dengan lampu hangat dan kucing yang tidur itu masih jadi alasan aku betah.\n\nKalian sendiri gimana? Bagian mana yang paling terasa beda dibanding sebelumnya?', interval '9 days');
  c := pg_temp.say(p, null, 'bagas.dev', 'Buatku yang paling kerasa itu alur briefnya. Terasa seperti dikasih kerjaan klien beneran, bukan sekadar latihan.', interval '9 days' - interval '40 minutes');
  perform pg_temp.say(p, c, 'rina_codes', 'Setuju! Apalagi kalau hasil kodenya langsung dicek, jadi ketahuan mana yang masih kurang.', interval '9 days' - interval '70 minutes');
  perform pg_temp.say(p, null, 'mei_pixel', 'Suasananya cozy banget. Aku main sambil dengerin lo-fi, pas sekali.', interval '8 days 20 hours');
  perform pg_temp.say(p, null, 'dimas_ui', 'Sebagai orang yang biasa ngurusin tampilan, aku suka karena hasil websitenya bisa langsung dilihat.', interval '8 days 6 hours');

  -- 2
  p := pg_temp.post('bagas.dev', 'Tips lolos brief klien pertama (tanpa spoiler)',
    E'Buat yang baru mulai: baca brief pelan-pelan dulu sebelum mengetik kode. Banyak kegagalanku dulu bukan karena CSS-nya salah, tapi karena ada satu permintaan klien yang terlewat.\n\nAda tips lain dari kalian?', interval '8 days 12 hours');
  c := pg_temp.say(p, null, 'alya.html', 'Tambahan dariku: catat dulu daftar permintaan klien di kertas, lalu centang satu per satu.', interval '8 days 9 hours');
  perform pg_temp.say(p, c, 'bagas.dev', 'Wah, itu bagus. Aku bakal coba cara checklist ini.', interval '8 days 7 hours');
  perform pg_temp.say(p, null, 'rina_codes', 'Satu lagi: jalankan dulu sebelum menyimpulkan salah. Kadang cuma kurang tanda titik koma atau kurung.', interval '8 days 2 hours');

  -- 3
  p := pg_temp.post('mei_pixel', 'Usul fitur: petunjuk bertahap kalau kode belum lolos',
    E'Kadang aku mentok di satu soal dan tidak mau langsung lihat jawaban. Bagaimana kalau ada petunjuk bertahap: pertama arah umum, kedua bagian yang perlu dicek, ketiga baru contoh?\n\nKalian setuju nggak?', interval '7 days 18 hours');
  c := pg_temp.say(p, null, 'dimas_ui', 'Setuju banget. Petunjuk bertahap lebih ramah buat pemula dibanding langsung jawaban.', interval '7 days 14 hours');
  perform pg_temp.say(p, null, 'alya.html', 'Asal tetap opsional ya, biar yang suka tantangan nggak terganggu.', interval '7 days 10 hours');
  perform pg_temp.say(p, c, 'mei_pixel', 'Betul, opsional saja. Jangan sampai mengurangi rasa puas pas berhasil sendiri.', interval '7 days 8 hours');

  -- 4
  p := pg_temp.post('dimas_ui', 'Ada yang main CodeQuest lewat HP? Nyaman nggak?',
    E'Lagi penasaran apakah main dari HP atau tablet nyaman, karena mengetik kode di layar kecil itu tantangan tersendiri.\n\nBagi yang pernah coba, kalian pakai keyboard eksternal atau langsung di layar?', interval '6 days 20 hours');
  perform pg_temp.say(p, null, 'bagas.dev', 'Aku lebih nyaman di laptop. Di HP cocoknya buat baca brief dan review hasil.', interval '6 days 16 hours');
  perform pg_temp.say(p, null, 'rina_codes', 'Tablet plus keyboard kecil lumayan sih. Layar HP saja terlalu sempit untuk CSS.', interval '6 days 11 hours');

  -- 5
  p := pg_temp.post('alya.html', 'Belajar flexbox lewat CodeQuest, ada yang sama?',
    E'Dulu aku selalu bingung justify-content vs align-items. Setelah beberapa brief yang butuh layout, akhirnya mulai nyambung.\n\nAda yang punya pengalaman serupa, atau konsep CSS lain yang akhirnya masuk lewat game ini?', interval '6 days');
  c := pg_temp.say(p, null, 'mei_pixel', 'Aku malah baru paham grid setelah dapat brief yang butuh galeri. Rasanya langsung ada gunanya.', interval '5 days 20 hours');
  perform pg_temp.say(p, c, 'alya.html', 'Nah ini, belajar sambil punya tujuan jauh lebih nempel daripada baca dokumentasi saja.', interval '5 days 17 hours');
  perform pg_temp.say(p, null, 'dimas_ui', 'Buatku konsep yang akhirnya paham itu specificity CSS, setelah beberapa kali gaya saya tertimpa.', interval '5 days 12 hours');

  -- 6
  p := pg_temp.post('rina_codes', 'Roadmap update berikutnya: kalian paling pengen apa?',
    E'Kalau boleh urun suara untuk update berikutnya, kalian paling pengen apa? Soal baru, tema studio baru, mode latihan bebas, atau hal lain?\n\nAku sendiri paling penasaran dengan brief yang lebih panjang.', interval '5 days 6 hours');
  perform pg_temp.say(p, null, 'bagas.dev', 'Mode latihan bebas, tanpa klien, buat eksperimen. Kadang pengen coba sesuatu tanpa tekanan.', interval '5 days 2 hours');
  perform pg_temp.say(p, null, 'mei_pixel', 'Aku mau lebih banyak dekorasi studio yang bisa dibuka. Kucingnya tolong ditambah teman!', interval '4 days 20 hours');
  perform pg_temp.say(p, null, 'alya.html', 'Brief yang lebih panjang juga oke, asal ada penanda progres biar nggak tersesat.', interval '4 days 15 hours');

  -- 7
  p := pg_temp.post('mei_pixel', 'Kucing di studio itu punya nama nggak sih?',
    E'Serius, kucing yang tidur di dekat lampu itu mencuri perhatianku. Ada nama resminya? Kalau belum, ayo kita usul nama di sini.\n\nVote komentar dengan nama favoritmu.', interval '4 days 8 hours');
  c := pg_temp.say(p, null, 'dimas_ui', 'Usul: Semicolon. Karena tidur terus tapi tetap penting.', interval '4 days 4 hours');
  perform pg_temp.say(p, null, 'bagas.dev', 'Usul: Bug. Muncul di mana saja, susah diusir, tapi lucu.', interval '4 days 1 hour');
  perform pg_temp.say(p, c, 'rina_codes', 'Semicolon menang buatku, haha.', interval '3 days 22 hours');
  perform pg_temp.say(p, null, 'alya.html', 'Atau Div. Kecil, netral, ada di mana-mana.', interval '3 days 19 hours');

  -- 8
  p := pg_temp.post('bagas.dev', 'Rekomendasi game atau situs belajar coding selain CodeQuest',
    E'Biar belajarnya nggak monoton, kalian biasanya pakai apa selain CodeQuest? Game, situs latihan, atau channel video yang menurut kalian efektif?\n\nBoleh sebut nama saja, tidak usah pasang link.', interval '3 days 12 hours');
  perform pg_temp.say(p, null, 'rina_codes', 'Aku selang-seling: main CodeQuest untuk praktik, nonton tutorial pendek untuk konsep baru.', interval '3 days 8 hours');
  perform pg_temp.say(p, null, 'dimas_ui', 'Buatku latihan menyalin desain dari situs favorit itu efektif banget buat CSS.', interval '3 days 3 hours');

  -- 9
  p := pg_temp.post('dimas_ui', 'Progres: akhirnya selesai bagian HTML dasar',
    E'Cuma mau berbagi, akhirnya tamat bagian HTML dasar. Senang rasanya melihat halaman buatan sendiri lolos pengecekan.\n\nSelanjutnya CSS. Doakan lancar ya!', interval '2 days 14 hours');
  c := pg_temp.say(p, null, 'alya.html', 'Selamat! Bagian CSS memang seru tapi sabar ya, ada fase bingung di tengah.', interval '2 days 10 hours');
  perform pg_temp.say(p, c, 'dimas_ui', 'Siap, makasih peringatannya. Aku siapin camilan dulu.', interval '2 days 7 hours');
  perform pg_temp.say(p, null, 'mei_pixel', 'Keren, lanjut terus! Kalau mentok, tanya di sini saja.', interval '2 days 3 hours');

  -- 10
  p := pg_temp.post('alya.html', 'Cara kalian menjaga konsistensi belajar coding tiap hari',
    E'Aku targetkan 20 menit sehari lewat CodeQuest. Kadang berhasil, kadang bolong tiga hari.\n\nKalian punya trik supaya tetap konsisten tanpa merasa terbebani?', interval '1 day 16 hours');
  c := pg_temp.say(p, null, 'rina_codes', 'Aku pasang jadwal tetap setelah makan malam. Kalau sudah jadi kebiasaan, tidak perlu mikir lagi.', interval '1 day 12 hours');
  perform pg_temp.say(p, c, 'alya.html', 'Jadwal tetap, oke, mau kucoba minggu ini.', interval '1 day 9 hours');
  perform pg_temp.say(p, null, 'bagas.dev', 'Targetnya kecil saja: selesaikan satu brief per hari, bukan satu level.', interval '1 day 5 hours');
  perform pg_temp.say(p, null, 'mei_pixel', 'Aku buat catatan kemajuan mingguan, lihat daftar yang sudah selesai itu memotivasi.', interval '22 hours');

  -- Vote contoh: tiap kiriman mendapat beberapa upvote dari akun lain (bukan penulisnya)
  insert into public.community_votes (user_id, target_type, target_id, value)
  select u.id, 'post', cp.id, 1
  from public.community_posts cp
  join public.site_users u on u.username in ('rina_codes','bagas.dev','mei_pixel','dimas_ui','alya.html')
  where u.id <> cp.user_id and (cp.id + u.id) % 3 <> 0
  on conflict do nothing;

  insert into public.community_votes (user_id, target_type, target_id, value)
  select u.id, 'comment', cc.id, 1
  from public.community_comments cc
  join public.site_users u on u.username in ('rina_codes','bagas.dev','mei_pixel','dimas_ui','alya.html')
  where u.id <> cc.user_id and (cc.id + u.id) % 4 = 0
  on conflict do nothing;
end $$;
