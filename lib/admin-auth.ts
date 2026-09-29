import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'khincc_admin'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 jam

const adminUsername = process.env.ADMIN_USERNAME || ''
const adminPassword = process.env.ADMIN_PASSWORD || ''
const sessionSecret = process.env.ADMIN_SESSION_SECRET || adminPassword

export const isAdminAuthConfigured = Boolean(adminUsername && adminPassword)

const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

const sign = (payload: string) =>
  createHmac('sha256', sessionSecret).update(payload).digest('base64url')

export function verifyCredentials(username: string, password: string) {
  if (!isAdminAuthConfigured) return false
  // Evaluate both so response time doesn't reveal which field was wrong
  const userOk = safeEqual(username, adminUsername)
  const passOk = safeEqual(password, adminPassword)
  return userOk && passOk
}

export function createSessionToken() {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  return `${payload}.${sign(payload)}`
}

export function isValidSession(token?: string) {
  if (!token || !isAdminAuthConfigured) return false
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 0) return false
  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  if (!safeEqual(signature, sign(payload))) return false
  return Number(payload) > Date.now() / 1000
}

export function isAdminRequest() {
  return isValidSession(cookies().get(SESSION_COOKIE)?.value)
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Sesi admin tidak valid. Silakan login kembali.' }, { status: 401 })

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}
