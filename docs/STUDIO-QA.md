# Khincc Studio: catatan verifikasi

Pengujian ini dilakukan pada 3 Oktober 2026 WITA di lingkungan lokal terisolasi. Tidak ada berita, pesan klien, kredensial, atau konten produksi yang dipakai sebagai data uji.

## Otomatis

- **15 tes lulus:** 6 untuk SQL antrean/snapshot/izin, 6 untuk transport GitHub dengan mock, 3 untuk login dan tanda tangan sesi.
- **TypeScript:** typecheck lulus setelah migrasi async request API Next.js.
- **Build produksi:** Next.js 15.5.27 berhasil dibuild. Warning non-blocking mencakup penggunaan img dan dependency hook lama; tidak disembunyikan.
- **Audit dependency produksi:** `npm audit --omit=dev` melaporkan 0 vulnerability setelah pembaruan Next.js, sanitize-html, dan PostCSS. Ini bukan audit keamanan komprehensif.

## Browser dengan data demo

- **Berita:** judul kosong ditolak; draft tersimpan; terbit, edit, cari, dan hapus berhasil.
- **Portofolio:** tambah desain, unggah gambar, edit, highlight on/off, tampil/sembunyi, urutkan dan hapus berhasil.
- **Inbox:** pencarian cocok dan hasil kosong; tombol balas merupakan mailto, tanpa email otomatis.
- **Komentar:** daftar dan pencarian cocok/kosong; endpoint moderasi lama dipakai kembali.
- **Sinkronisasi UI:** retry dan status simulasi ditampilkan tanpa commit ke GitHub sungguhan.
- **Pocket:** filter berita/karya, draft tidak ditampilkan, dan tautan artikel demo berfungsi.
- **Sesi:** keluar, login salah, dan login demo benar ditangani.
- **Tampilan:** dashboard terang/gelap, daftar berita, editor, portofolio, inbox, komentar, pengaturan, feed publik diperiksa pada viewport mobile 390 px. Dashboard desktop 1440 px diperiksa; tidak ditemukan overflow horizontal pada layar yang diperiksa.
- **Build produksi lokal:** layar login 375 px tidak mengalami overflow; API berita, portofolio, inbox, dan sinkronisasi mengembalikan 401 tanpa sesi.
- **Service worker:** registrasi dan kontrol halaman berhasil; cache hanya memuat `/offline.html`. Navigasi ke `/app` saat jaringan dimatikan menampilkan halaman offline, bukan data admin yang tersimpan.

## Belum merupakan verifikasi produksi

Belum diuji pada perangkat iPhone fisik, akun admin live, Supabase produksi, token GitHub runtime, scheduler produksi, atau domain Vercel setelah merge. Sinkronisasi di browser preview adalah simulasi; implementasi transport dan SQL diuji terpisah dengan mock dan PostgreSQL lokal PGlite.

Aktivasi wajib mengikuti `docs/STUDIO-IPHONE.md` dan acceptance test staging. Konten statis profil/layout/CV tetap dikelola dari source code, dan push notification belum diimplementasikan.
