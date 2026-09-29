/**
 * lib/admin-auth.ts
 * Sistem login ADMIN. Hanya untuk server.
 *
 * Cara kerja:
 * 1. Username & password admin disimpan di Environment Variables
 *    (ADMIN_USERNAME, ADMIN_PASSWORD), bukan di kode, jadi tidak ikut ke GitHub.
 * 2. Setelah login berhasil, server membuat "token sesi" berisi waktu kedaluwarsa
 *    lalu ditandatangani (HMAC) dengan kunci rahasia. Token disimpan di cookie `khincc_admin`.
 * 3. Setiap permintaan ke API admin, tanda tangan token dicek ulang. Kalau token diubah
 *    sedikit saja oleh orang lain, tanda tangannya tidak cocok dan ditolak.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'khincc_admin' // nama cookie sesi admin
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 jam, setelah itu harus login lagi

const adminUsername = process.env.ADMIN_USERNAME || ''
const adminPassword = process.env.ADMIN_PASSWORD || ''
// Kunci untuk menandatangani token. Kalau tidak diisi, pakai password admin
const sessionSecret = process.env.ADMIN_SESSION_SECRET || adminPassword

// true kalau username & password admin sudah diatur di server
export const isAdminAuthConfigured = Boolean(adminUsername && adminPassword)

// Bandingkan dua teks dengan waktu yang selalu sama, supaya penyerang tidak bisa
// menebak password huruf demi huruf dari lama waktu respons server
export const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

// Buat tanda tangan HMAC-SHA256 untuk sebuah teks
const sign = (payload: string) =>
  createHmac('sha256', sessionSecret).update(payload).digest('base64url')

// Cek username & password dari form login
export function verifyCredentials(username: string, password: string) {
  if (!isAdminAuthConfigured) return false
  // Keduanya selalu dicek, supaya waktu respons tidak membocorkan kolom mana yang salah
  const userOk = safeEqual(username, adminUsername)
  const passOk = safeEqual(password, adminPassword)
  return userOk && passOk
}

// Token = "<waktu kedaluwarsa>.<tanda tangan>"
export function createSessionToken() {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  return `${payload}.${sign(payload)}`
}

// Token sah kalau tanda tangannya cocok DAN belum kedaluwarsa
export function isValidSession(token?: string) {
  if (!token || !isAdminAuthConfigured) return false
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 0) return false
  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  if (!safeEqual(signature, sign(payload))) return false
  return Number(payload) > Date.now() / 1000
}

// Dipanggil di awal setiap API admin: apakah yang meminta ini admin yang sudah login?
export function isAdminRequest() {
  return isValidSession(cookies().get(SESSION_COOKIE)?.value)
}

// Jawaban standar kalau belum login (kode 401 = Unauthorized)
export const unauthorized = () =>
  NextResponse.json({ error: 'Sesi admin tidak valid. Silakan login kembali.' }, { status: 401 })

// Pengaturan cookie sesi admin
export const sessionCookieOptions = {
  httpOnly: true, // tidak bisa dibaca JavaScript di browser (lebih aman dari pencurian)
  secure: process.env.NODE_ENV === 'production', // di website online hanya dikirim lewat HTTPS
  sameSite: 'strict' as const, // tidak ikut terkirim dari website lain
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}
