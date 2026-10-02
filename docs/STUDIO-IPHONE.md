# Khincc Studio untuk iPhone

PWA ini menambahkan `/studio` untuk pengelolaan konten dan `/app` untuk pengunjung. Keduanya berada di aplikasi Next.js yang sama dengan website, bukan aplikasi App Store atau database baru.

## Yang tersedia

- **Studio:** ringkasan berita, draft, portofolio, dan pesan klien; tema terang/gelap; navigasi bawah iPhone.
- **Berita:** tulis/edit, visual/HTML, unggah gambar, kategori, tag, draft, jadwal terbit, pencarian, dan hapus.
- **Portofolio:** tambah/edit desain, video, web; unggah cover; bahasa EN/ID pada field yang sudah tersedia; highlight, urutkan, sembunyikan, dan hapus.
- **Inbox:** baca dan cari brief klien. Tombol balas membuka aplikasi email, bukan mengirim email otomatis.
- **Komentar:** pencarian dan moderasi melalui API admin yang sudah ada.
- **Pocket:** feed publik terbaru, filter berita/portofolio, muat ulang saat aplikasi aktif dan setiap 60 detik selama terlihat.
- **GitHub:** arsip snapshot JSON konten yang sudah diterbitkan, status koneksi, retry manual, dan workflow retry terjadwal opsional.

Editor tetap memakai skema CMS website. Teks statis profil, layanan, layout, CV, dan identitas website yang sebelumnya ditulis dalam kode belum berubah menjadi CMS. Pembaruan bagian tersebut masih melalui source code. Notifikasi push, offline authoring, autosave draft, dan publikasi App Store tidak termasuk.

## Alur data dan batas privasi

```text
iPhone /studio
  -> autentikasi admin yang sudah ada
  -> API CMS -> Supabase (sumber data utama)
                -> revalidasi website /berita, /work, /app
                -> trigger transaction -> studio_sync
                   -> snapshot publik -> GitHub content-sync/content/published.json
```

Repositori bersifat publik. Draft, berita terjadwal yang belum waktunya, karya tersembunyi, pesan klien, komentar, akun, password, dan token tidak diekspor. Foto/media tetap berada di storage; GitHub menyimpan URL media, bukan salinan binernya.

Sinkronisasi adalah satu arah, bukan GitHub-to-Supabase. Edit langsung pada JSON GitHub tidak mengubah CMS. Beberapa perubahan berdekatan dapat tergabung dalam snapshot terakhir; ini bukan audit log untuk setiap penekanan tombol. Penghapusan atau unpublish akan menghapus konten dari snapshot berikutnya, tetapi commit lama di repositori publik tetap dapat memuat versi yang pernah diterbitkan.

CMS tetap bisa menyimpan jika GitHub gagal. Trigger SQL menandai versi antrean dalam transaksi yang sama dengan perubahan konten. Worker memakai lease 120 detik; gagal atau terputus tidak menghapus antrean. Konflik SHA dicoba ulang hingga tiga kali. Perubahan setelah snapshot diambil tetap berstatus pending. Retry memeriksa snapshot lagi sehingga berita terjadwal juga masuk saat waktunya tiba.

## Aktivasi produksi

Jangan merge/deploy sebelum target proyek dan izin domain dikonfirmasi. Gunakan Node.js 22 pada build dan runtime.

### Database

Di proyek Supabase yang sudah digunakan website:

1. Pastikan `supabase/schema.sql` sudah dijalankan, termasuk tabel `portfolio_items`, `is_featured`, berita, storage, dan RLS.
2. Jalankan `supabase/migrations/20261003_studio_sync.sql`.
3. Pastikan environment website yang lama tetap tersedia:
   `NEXT_PUBLIC_SUPABASE_URL`, kunci publishable/anon, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET`.

Tidak ada migrasi yang dijalankan otomatis dari frontend. Tabel sinkronisasi dan RPC tidak dapat diakses role `anon` atau `authenticated`; hanya server service-role.

### Arsip GitHub

1. Buat branch `content-sync` dari `main` setelah perubahan kode telah disetujui.
2. Buat fine-grained token khusus repositori `khincc00/PORTFOLIO-FIX-DEPLOY`, dengan izin `Contents: read and write` serta masa berlaku yang dipantau.
3. Simpan token hanya di secret environment hosting sebagai `CONTENT_GITHUB_TOKEN`. Jangan menaruhnya di chat, source code, screenshot, atau variabel berawalan `NEXT_PUBLIC_`.
4. Atur `CONTENT_GITHUB_REPOSITORY=khincc00/PORTFOLIO-FIX-DEPLOY` dan `CONTENT_GITHUB_BRANCH=content-sync`.
5. Batasi deployment Vercel untuk branch arsip. Branch `content-sync` tidak perlu dideploy; jika Git integration membuat preview untuk semua branch, atur Git deployment/ignored build rules agar arsip tidak men-trigger build.
6. Login ke `/studio`, buka Pengaturan, jalankan Coba sinkronkan, kemudian periksa commit JSON.

Branch arsip tidak dibuat otomatis dan token tidak dibuat atau dipindahkan dari koneksi Computer. Kredensial connector sesi bukan kredensial runtime aplikasi.

### Retry terjadwal

1. Buat secret acak panjang `CONTENT_SYNC_CRON_SECRET` pada hosting.
2. Simpan nilai yang sama pada GitHub Actions repository secret `CONTENT_SYNC_CRON_SECRET`.
3. Buat Actions repository variable `CONTENT_SYNC_URL=https://khincreator.com/api/studio/sync`.
4. Setelah workflow berada di default branch, jalankan workflow manual satu kali.
5. Workflow meminta retry setiap 15 menit. Jadwal GitHub Actions bukan jaminan waktu real-time dan dapat tertunda; status dapat diperiksa dari Studio. Sinkronisasi langsung tetap dicoba setelah setiap save konten.

Untuk draft/private data yang juga ingin diarsipkan, gunakan desain backup terpisah ke repositori PRIVATE dan persetujuan eksplisit. Jangan menghilangkan filter privasi yang ada.

## Pasang di iPhone

Setelah deployment pada HTTPS domain sendiri, buka `https://khincreator.com/studio` di Safari untuk admin, atau `https://khincreator.com/app` untuk pengunjung. Pilih Bagikan, Tambahkan ke Layar Utama, aktifkan Buka sebagai App Web, lalu Tambah, sesuai [panduan Apple](https://support.apple.com/guide/iphone/turn-a-website-into-an-app-iph42ab2f3a7/ios).

Studio dan Pocket mempunyai manifest dengan identitas berbeda. Login admin tetap diperlukan; memasang ikon tidak memberikan akses admin. Instalasi PWA tidak dijanjikan bekerja di iframe preview Computer.

Service worker hanya menyimpan halaman offline statis. API, halaman admin, pesan klien, dan respons konten tidak dimasukkan ke cache service worker. Saat offline, penyimpanan tidak dilakukan; jangan menutup editor sebelum konten berhasil disimpan. Tema Studio saat ini hanya bertahan selama sesi halaman.

## Pengujian dan verifikasi

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Tes mencakup HMAC/sesi kedaluwarsa, aturan snapshot publik, pending version, lease concurrency/recovery, kegagalan transport, deduplikasi, konflik SHA, dan izin SQL. PostgreSQL untuk tes menggunakan PGlite; GitHub transport menggunakan respons mock tanpa kredensial nyata.

Sebelum go-live, lakukan acceptance test di staging dengan database terpisah:

- Login admin, buat draft, pastikan tidak terlihat di feed maupun JSON GitHub.
- Terbitkan berita uji; periksa `/berita`, Pocket, dan commit GitHub.
- Edit, jadwalkan, unpublish, dan hapus berita; periksa sinkronisasi berikutnya.
- Tambah karya, unggah cover, ubah highlight/urutan, sembunyikan, dan hapus.
- Cabut sementara izin token pada staging; pastikan save CMS berhasil dan status retry terlihat, lalu pulihkan dan retry.
- Dua save bersamaan; pastikan versi terbaru akhirnya tersinkron.
- Pastikan API admin tanpa cookie menjawab 401.
- Pasang pada iPhone nyata, uji safe-area/keyboard, login, unggah foto, koneksi terputus, keluar, dan buka kembali.

Pengujian lokal atau viewport mobile bukan sertifikasi Safari/iPhone nyata, dan bukan bukti sinkronisasi ke database/GitHub produksi telah aktif.
