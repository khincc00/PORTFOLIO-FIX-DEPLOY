/**
 * utils/supabase/server.ts
 * Template resmi Supabase untuk membuat koneksi di SERVER yang membaca cookie sesi Supabase.
 *
 * Catatan: saat ini TIDAK dipakai. Kode server memakai lib/supabase.ts dan lib/supabase-admin.ts.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key";

export const createClient = (cookieStore?: ReturnType<typeof cookies>) => {
  const store = cookieStore || cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        } catch {
          // setAll dipanggil dari Server Component (yang tidak boleh mengubah cookie).
          // Aman diabaikan kalau ada middleware yang menyegarkan sesi pengguna.
        }
      },
    },
  });
};
