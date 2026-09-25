# Portfolio Khincc - Next.js & Supabase

Website portfolio modern untuk multimedia creator, remote designer, dan video editor (@khinccofficial). Dibangun menggunakan Next.js 14 App Router, Tailwind CSS, Supabase PostgreSQL, dan di-deploy melalui Vercel.

## 🚀 Fitur Utama
- **Curated Selected Works**: Showcase gear reviews dengan filter kategori dinamis & tautan langsung ke Instagram Reels.
- **Client Inquiry Form**: Formulir kontak interaktif terintegrasi langsung dengan database Supabase (`contacts`).
- **Admin Dashboard**: Halaman manajemen di `/admin` untuk memonitor portfolio dan pesan kontak yang masuk.
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
3. Deploy akan berjalan otomatis setiap push ke branch `main`.
