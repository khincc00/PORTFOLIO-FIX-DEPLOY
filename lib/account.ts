import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserId } from '@/lib/user-auth'

export interface SiteUser {
  id: number
  username: string
  display_name: string
}

export async function getCurrentUser(): Promise<SiteUser | null> {
  const id = getUserId()
  if (!id) return null
  const { data } = await supabaseAdmin.from('site_users').select('id,username,display_name').eq('id', id).maybeSingle()
  return data || null
}

/** True when a guest name equals (case-insensitively) a registered username or display name */
export async function isNameTakenByAccount(name: string) {
  const pattern = name.replace(/[\\%_]/g, '\\$&')
  const [byUsername, byDisplay] = await Promise.all([
    supabaseAdmin.from('site_users').select('username,display_name').ilike('username', pattern).limit(50),
    supabaseAdmin.from('site_users').select('username,display_name').ilike('display_name', pattern).limit(50),
  ])
  const target = name.toLowerCase()
  return [...(byUsername.data || []), ...(byDisplay.data || [])].some(
    (u) => u.username.toLowerCase() === target || u.display_name.toLowerCase() === target
  )
}
