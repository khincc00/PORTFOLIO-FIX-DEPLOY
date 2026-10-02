/**
 * lib/account.ts
 * Data akun pengunjung (yang mendaftar untuk berkomentar). Hanya untuk server.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserId } from '@/lib/user-auth'

// Bentuk data akun yang aman untuk dipakai (tanpa hash password)
export interface SiteUser {
  id: number
  username: string
  display_name: string
}

// Akun yang sedang login, dibaca dari cookie `khincc_user`. null kalau belum login
export async function getCurrentUser(): Promise<SiteUser | null> {
  const id = await getUserId()
  if (!id) return null
  const { data } = await supabaseAdmin.from('site_users').select('id,username,display_name').eq('id', id).maybeSingle()
  return data || null
}

/**
 * Cek apakah nama tamu sama dengan username atau nama tampilan akun terdaftar
 * (huruf besar/kecil dianggap sama). Tujuannya supaya tamu tidak bisa menyamar
 * sebagai anggota yang sudah punya akun.
 */
export async function isNameTakenByAccount(name: string) {
  // Karakter \ % _ punya arti khusus di pencarian ILIKE, jadi diberi tanda escape
  const pattern = name.replace(/[\\%_]/g, '\\$&')
  // Cari di kolom username dan display_name secara bersamaan
  const [byUsername, byDisplay] = await Promise.all([
    supabaseAdmin.from('site_users').select('username,display_name').ilike('username', pattern).limit(50),
    supabaseAdmin.from('site_users').select('username,display_name').ilike('display_name', pattern).limit(50),
  ])
  const target = name.toLowerCase()
  return [...(byUsername.data || []), ...(byDisplay.data || [])].some(
    (u) => u.username.toLowerCase() === target || u.display_name.toLowerCase() === target
  )
}
