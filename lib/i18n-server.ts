/**
 * lib/i18n-server.ts
 * Terjemahan untuk kode yang berjalan di SERVER (API route).
 *
 * Tombol EN/ID di header menyimpan pilihan bahasa ke cookie `khincc_lang`.
 * File ini membaca cookie itu, supaya pesan error dari API (misalnya
 * "Nama wajib diisi") ikut tampil dalam bahasa yang dipilih pengunjung.
 */
import { cookies } from 'next/headers'
import { LANG_COOKIE, isLang, translate, type DictKey, type Lang } from '@/lib/i18n'

// Bahasa pengunjung saat ini, diambil dari cookie. Default: Inggris ('en')
export function serverLang(): Lang {
  const value = cookies().get(LANG_COOKIE)?.value
  return isLang(value) ? value : 'en'
}

// st = "server translate". Contoh: st('comments.err.name') → teks sesuai bahasa pengunjung
export const st = (key: DictKey, vars?: Record<string, string | number>) => translate(serverLang(), key, vars)
