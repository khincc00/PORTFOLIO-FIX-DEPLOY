/**
 * utils/supabase/client.ts
 * Pembuat koneksi Supabase untuk BROWSER, bawaan template resmi Supabase (@supabase/ssr).
 *
 * Catatan: saat ini file ini TIDAK dipakai di mana pun. Website memakai lib/supabase.ts
 * dan lib/supabase-admin.ts. File ini disimpan untuk berjaga-jaga kalau nanti
 * memakai fitur login bawaan Supabase (Supabase Auth).
 */
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
