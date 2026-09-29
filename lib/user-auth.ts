/**
 * lib/user-auth.ts
 * Sistem akun PENGUNJUNG untuk berkomentar (username + password, tanpa email). Hanya untuk server.
 *
 * Ada dua jenis cookie:
 * - `khincc_user`: token login akun (berlaku 30 hari), ditandatangani seperti token admin.
 * - `khincc_vid` : id acak untuk tamu tanpa akun (berlaku 1 tahun). Dipakai supaya tamu
 *                  bisa menghapus komentarnya sendiri dan tidak memberi reaksi dobel.
 */
import { createHash, createHmac, randomBytes, randomUUID, scryptSync } from 'crypto'
import { cookies, headers } from 'next/headers'
import { safeEqual } from '@/lib/admin-auth'

export const USER_COOKIE = 'khincc_user'
export const VISITOR_COOKIE = 'khincc_vid'
const USER_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 hari

// Kunci rahasia untuk tanda tangan token (sama sumbernya dengan admin)
const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''

// Pengaturan dasar cookie. 'lax' = cookie tetap terkirim saat pengunjung datang dari link luar
export const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export const userCookieOptions = { ...cookieBase, maxAge: USER_TTL_SECONDS }
export const visitorCookieOptions = { ...cookieBase, maxAge: 60 * 60 * 24 * 365 }

// Awalan "user:" membuat token pengunjung tidak akan pernah sah sebagai token admin (dan sebaliknya)
const sign = (payload: string) => createHmac('sha256', secret).update(`user:${payload}`).digest('base64url')

/**
 * Ubah password jadi hash sebelum disimpan. Password asli TIDAK pernah disimpan.
 * scrypt sengaja dibuat lambat supaya sulit ditebak paksa (brute force).
 * "salt" acak membuat dua password yang sama menghasilkan hash berbeda.
 * Hasilnya: "scrypt$<salt>$<hash>"
 */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('base64url')}`
}

// Cek password saat login: hitung ulang hash dengan salt yang sama lalu bandingkan
export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  return safeEqual(scryptSync(password, salt, 64).toString('base64url'), hash)
}

// Token login = "<id akun>.<waktu kedaluwarsa>.<tanda tangan>"
export function createUserToken(userId: number) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + USER_TTL_SECONDS}`
  return `${payload}.${sign(payload)}`
}

/** Id akun pengunjung yang sedang login, atau null kalau belum login / token tidak sah */
export function getUserId(): number | null {
  const token = cookies().get(USER_COOKIE)?.value
  if (!token || !secret) return null
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 0) return null
  const payload = token.slice(0, lastDot)
  if (!safeEqual(token.slice(lastDot + 1), sign(payload))) return null
  const [id, expires] = payload.split('.')
  if (Number(expires) < Date.now() / 1000) return null
  return Number(id) || null
}

/** Id tamu dari cookie. `fresh: true` artinya id baru dibuat dan harus disimpan ke cookie */
export function getVisitorId() {
  const existing = cookies().get(VISITOR_COOKIE)?.value
  // Format UUID: 36 karakter berisi angka, huruf a–f, dan strip
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return { id: existing, fresh: false }
  return { id: randomUUID(), fresh: true }
}

// Alamat IP pengunjung dalam bentuk hash (bukan IP asli) untuk membatasi spam komentar
export function getIpHash() {
  const ip = headers().get('x-forwarded-for')?.split(',')[0].trim() || headers().get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32)
}

// Username: 3–20 karakter, hanya huruf, angka, garis bawah, dan titik
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,20}$/
// Nama yang tidak boleh dipakai pengunjung supaya tidak menyamar jadi pemilik website
export const RESERVED_NAMES = ['admin', 'administrator', 'khincc', 'khinccofficial', 'penulis', 'moderator', 'taufiq sholikhin']

// Rapikan spasi berlebih. Contoh: "  Budi   Santoso " → "Budi Santoso"
export function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim()
}

// Cek nama terlarang, termasuk variasi seperti "Khin_cc" atau "admin." (tanda baca diabaikan)
export function isReservedName(name: string) {
  const n = normalizeName(name).toLowerCase()
  return RESERVED_NAMES.some((r) => n === r || n.replace(/[\s_.]/g, '') === r.replace(/\s/g, ''))
}
