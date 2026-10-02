/**
 * lib/rate-limit.ts
 * Pembatas percobaan login (anti tebak password). Hanya untuk server.
 *
 * Aturan: setelah 4 kali SALAH dari jaringan (IP) yang sama, login dikunci 15 menit.
 * Login yang berhasil menghapus hitungan. Hitungan disimpan di tabel `login_attempts`
 * (Supabase) supaya tetap berlaku walau Vercel memakai banyak server. Kalau tabelnya belum
 * dibuat atau database tidak bisa diakses, dipakai penghitung di memori server sebagai cadangan.
 */
import { supabaseAdmin, isAdminDbConfigured } from '@/lib/supabase-admin'
import { getIpHash } from '@/lib/user-auth'

export const MAX_FAILED_ATTEMPTS = 4
const LOCK_MS = 15 * 60 * 1000 // lama dikunci
const WINDOW_MS = 15 * 60 * 1000 // percobaan gagal lama dilupakan setelah waktu ini

type Row = { fails: number; first_at: number; locked_until: number }
const memory = new Map<string, Row>() // cadangan kalau database tidak tersedia

// Kunci unik per jenis login + IP (IP sudah berbentuk hash, bukan IP asli)
const keyFor = async (scope: 'admin' | 'user') => `${scope}:${await getIpHash()}`

async function load(key: string): Promise<Row | null> {
  if (isAdminDbConfigured) {
    const { data, error } = await supabaseAdmin
      .from('login_attempts')
      .select('fails,first_at,locked_until')
      .eq('key', key)
      .maybeSingle()
    if (!error) {
      return data
        ? { fails: data.fails, first_at: new Date(data.first_at).getTime(), locked_until: new Date(data.locked_until).getTime() }
        : null
    }
  }
  return memory.get(key) || null
}

async function save(key: string, row: Row) {
  if (isAdminDbConfigured) {
    const { error } = await supabaseAdmin.from('login_attempts').upsert({
      key,
      fails: row.fails,
      first_at: new Date(row.first_at).toISOString(),
      locked_until: new Date(row.locked_until).toISOString(),
    })
    if (!error) return
  }
  memory.set(key, row)
}

// Cek sebelum memeriksa password. Mengembalikan sisa detik terkunci, atau 0 kalau boleh mencoba
export async function lockedSeconds(scope: 'admin' | 'user') {
  const row = await load(await keyFor(scope))
  const left = row ? row.locked_until - Date.now() : 0
  return left > 0 ? Math.ceil(left / 1000) : 0
}

// Catat satu percobaan yang salah. Percobaan ke-4 langsung mengunci
export async function recordFailure(scope: 'admin' | 'user') {
  const key = await keyFor(scope)
  const now = Date.now()
  const prev = await load(key)
  const fresh = !prev || now - prev.first_at > WINDOW_MS
  const fails = fresh ? 1 : prev.fails + 1
  await save(key, {
    fails,
    first_at: fresh ? now : prev.first_at,
    locked_until: fails >= MAX_FAILED_ATTEMPTS ? now + LOCK_MS : 0,
  })
}

// Login berhasil: hapus hitungan gagal
export async function clearFailures(scope: 'admin' | 'user') {
  const key = await keyFor(scope)
  memory.delete(key)
  if (isAdminDbConfigured) await supabaseAdmin.from('login_attempts').delete().eq('key', key)
}

// Teks "coba lagi dalam N menit" untuk pesan error
export const lockedMessage = (seconds: number) =>
  `Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(seconds / 60)} menit.`
