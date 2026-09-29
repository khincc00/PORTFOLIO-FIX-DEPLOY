import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/supabase'

// Server-only client that bypasses RLS. Never import this from a client component.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const isAdminDbConfigured = Boolean(isSupabaseConfigured && serviceRoleKey)

export const supabaseAdmin = createClient(
  isAdminDbConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : 'https://placeholder.supabase.co',
  isAdminDbConfigured ? serviceRoleKey : 'placeholder-service-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export const adminDbMissingMessage =
  'SUPABASE_SERVICE_ROLE_KEY belum diisi. Tambahkan di .env.local dan Environment Variables Vercel agar admin bisa menyimpan data.'
