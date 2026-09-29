/**
 * lib/supabase-admin.ts
 * Koneksi Supabase dengan hak AKSES PENUH (service role key).
 *
 * Bedanya dengan lib/supabase.ts:
 * - lib/supabase.ts memakai kunci publik (anon), jadi hanya boleh membaca data
 *   yang diizinkan aturan RLS (Row Level Security) di database.
 * - File ini memakai service role key yang MENGABAIKAN RLS, jadi bisa menulis,
 *   mengubah, dan menghapus apa saja.
 *
 * PENTING: file ini hanya boleh dipakai di server (API route / server component).
 * Jangan pernah di-import dari komponen 'use client', karena kuncinya bisa bocor ke browser.
 */
import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/supabase'

// Kunci rahasia dari .env.local (lokal) atau Environment Variables di Vercel (online)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// true kalau URL Supabase DAN service role key sudah diisi
export const isAdminDbConfigured = Boolean(isSupabaseConfigured && serviceRoleKey)

// Kalau kunci belum ada, pakai alamat palsu supaya build tidak gagal.
// API admin akan mengecek isAdminDbConfigured dulu sebelum memakai client ini.
export const supabaseAdmin = createClient(
  isAdminDbConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : 'https://placeholder.supabase.co',
  isAdminDbConfigured ? serviceRoleKey : 'placeholder-service-key',
  // Server tidak perlu menyimpan sesi login Supabase
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Pesan yang ditampilkan di admin kalau kunci belum diisi
export const adminDbMissingMessage =
  'SUPABASE_SERVICE_ROLE_KEY belum diisi. Tambahkan di .env.local dan Environment Variables Vercel agar admin bisa menyimpan data.'
