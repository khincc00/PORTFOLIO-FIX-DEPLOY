import { createHash, createHmac, randomBytes, randomUUID, scryptSync } from 'crypto'
import { cookies, headers } from 'next/headers'
import { safeEqual } from '@/lib/admin-auth'

// Visitor accounts for news comments: username + password, no email required

export const USER_COOKIE = 'khincc_user'
export const VISITOR_COOKIE = 'khincc_vid'
const USER_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 hari

const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''

export const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export const userCookieOptions = { ...cookieBase, maxAge: USER_TTL_SECONDS }
export const visitorCookieOptions = { ...cookieBase, maxAge: 60 * 60 * 24 * 365 }

// Prefix keeps user tokens from ever validating as admin tokens (and vice versa)
const sign = (payload: string) => createHmac('sha256', secret).update(`user:${payload}`).digest('base64url')

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('base64url')}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  return safeEqual(scryptSync(password, salt, 64).toString('base64url'), hash)
}

export function createUserToken(userId: number) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + USER_TTL_SECONDS}`
  return `${payload}.${sign(payload)}`
}

/** Returns the logged-in visitor account id, or null */
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

/** Anonymous visitor id from cookie; `fresh` is set when the caller must store a new one */
export function getVisitorId() {
  const existing = cookies().get(VISITOR_COOKIE)?.value
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return { id: existing, fresh: false }
  return { id: randomUUID(), fresh: true }
}

export function getIpHash() {
  const ip = headers().get('x-forwarded-for')?.split(',')[0].trim() || headers().get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32)
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,20}$/
export const RESERVED_NAMES = ['admin', 'administrator', 'khincc', 'khinccofficial', 'penulis', 'moderator', 'taufiq sholikhin']

export function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim()
}

export function isReservedName(name: string) {
  const n = normalizeName(name).toLowerCase()
  return RESERVED_NAMES.some((r) => n === r || n.replace(/[\s_.]/g, '') === r.replace(/\s/g, ''))
}
