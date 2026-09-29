# Portfolio Khincc - Next.js & Supabase

Website portfolio modern untuk multimedia creator, remote designer, dan video editor (@khinccofficial). Dibangun menggunakan Next.js 14 App Router, Tailwind CSS, Supabase PostgreSQL, dan di-deploy melalui Vercel.

## 🚀 Fitur Utama
- **Curated Selected Works**: Showcase gear reviews dengan filter kategori dinamis & tautan langsung ke Instagram Reels.
- **Client Inquiry Form**: Formulir kontak interaktif terintegrasi langsung dengan database Supabase (`contacts`).
- **Admin Dashboard**: Halaman manajemen di `/admin` (alias `/admin.php`) untuk memonitor portfolio dan pesan kontak yang masuk.
- **Berita / Kabar Terbaru**: Tulis, jadwalkan, dan terbitkan berita ala WordPress dari `/admin` (editor visual, gambar unggulan, kategori, tag, draft). Tampil di `/berita` dan di beranda.
- **Graceful Local Fallback**: Tetap berjalan mulus dengan data seed lokal jika koneksi Supabase belum dikonfigurasi.

## 🛠️ Stack Teknologi
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL dengan Row Level Security)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel & GitHub CI/CD

## ⚙️ Cara Menghubungkan Supabase & Vercel
1. Jalankan script SQL di Supabase:
   - Buka **Supabase Dashboard** > **SQL Editor**.
   - Salin isi dari `supabase/schema.sql` lalu jalankan (**Run**).
2. Tambahkan Environment Variables di Vercel:
   - Buka **Vercel Dashboard** > Project **Settings** > **Environment Variables**.
   - Masukkan:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (rahasia — dari Supabase > Project Settings > API)
     - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
3. Deploy akan berjalan otomatis setiap push ke branch `main`.

## 🗺️ Peta Struktur Kode (untuk belajar)
Setiap file kode diawali komentar berbahasa Indonesia yang menjelaskan fungsinya. Komentar ini hanya ada di kode dan otomatis dibuang saat build, jadi tidak terlihat di website.

```
app/                      ← setiap folder berisi page.tsx = satu halaman website
├── layout.tsx            kerangka semua halaman: SEO, font, tema, bahasa
├── page.tsx              beranda (ambil data) → tampilan di components/HomeClient.tsx
├── globals.css           semua CSS halaman publik (termasuk mode malam & tampilan HP)
├── work/                 /work — semua portfolio
├── berita/               /berita — daftar berita; [slug]/ = halaman satu berita + komentar
├── admin/                /admin — login admin, Dashboard, Portfolio, Berita, Komentar
├── api/                  "pintu" server yang dipanggil browser (route.ts = satu alamat API)
│   ├── admin/…           khusus admin (dicek login dulu)
│   ├── news/…            berita, komentar, reaksi
│   ├── account/…         daftar / masuk / keluar akun pengunjung
│   └── contact/          form kontak
├── sitemap.ts, robots.ts SEO untuk Google
└── icon.tsx, apple-icon.tsx, opengraph-image.tsx   ikon & gambar preview dibuat dari kode
components/               potongan tampilan yang dipakai di banyak halaman
├── SiteHeader.tsx        menu atas, tombol EN/ID, tombol siang/malam
├── Preferences.tsx       penyimpan bahasa & tema (dipakai lewat usePrefs())
├── HomeClient.tsx        tampilan beranda
└── PortfolioBlocks.tsx   kartu Design / Reels / YouTube / TikTok / Web
lib/                      logika & data tanpa tampilan
├── i18n.ts               kamus semua teks Inggris + Indonesia
├── portfolio-*.ts        tipe, data bawaan, dan fungsi server portfolio
├── news*.ts              berita (publik & admin)
├── admin-auth.ts, user-auth.ts   sistem login admin & akun pengunjung
└── supabase*.ts          koneksi ke database
supabase/schema.sql       struktur tabel database & aturan keamanan (RLS)
public/                   file statis: gambar, CV (bisa diakses langsung lewat URL)
```

**Istilah yang sering muncul di komentar:**
- **Server component vs `'use client'`**: file tanpa `'use client'` berjalan di server (bisa baca database langsung); file dengan `'use client'` berjalan di browser (bisa interaktif: klik, animasi, form).
- **API route**: file `route.ts` di `app/api/…`. Fungsi `GET`, `POST`, `PUT`, `DELETE` di dalamnya menangani jenis permintaan yang sesuai.
- **revalidate**: berapa detik halaman boleh disimpan di cache sebelum dibuat ulang.
- **RLS**: aturan keamanan di database tentang siapa boleh membaca atau mengubah data.

**File tanpa komentar** (format JSON tidak mendukung komentar):
- `package.json`: daftar library dan perintah (`npm run dev` untuk menjalankan di komputer, `npm run build` untuk membuat versi siap online).
- `tsconfig.json`: pengaturan TypeScript.
