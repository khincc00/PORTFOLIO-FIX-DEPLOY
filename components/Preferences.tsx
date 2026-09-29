'use client'
/**
 * components/Preferences.tsx
 * PENGATURAN BAHASA (EN/ID) & TEMA (siang/malam) untuk seluruh website.
 *
 * Konsep React yang dipakai: "Context". PreferencesProvider membungkus semua halaman
 * (di app/layout.tsx), lalu komponen mana pun bisa memanggil usePrefs() untuk mendapatkan:
 *   lang        → bahasa aktif ('en' / 'id')
 *   theme       → tema aktif ('light' / 'dark')
 *   setLang()   → ganti bahasa
 *   toggleTheme() → tukar siang ↔ malam
 *   t('kunci')  → ambil teks dari kamus lib/i18n.ts sesuai bahasa aktif
 *
 * Pilihan disimpan di localStorage browser (tetap diingat saat kembali ke website)
 * dan di cookie (supaya server juga tahu bahasa pengunjung).
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { LANG_COOKIE, LANG_STORAGE, THEME_STORAGE, formatDate, isLang, translate, type DictKey, type Lang } from '@/lib/i18n'

type Theme = 'light' | 'dark'

// Isi yang disediakan Context untuk semua komponen
interface Prefs {
  lang: Lang
  theme: Theme
  setLang: (lang: Lang) => void
  toggleTheme: () => void
  t: (key: DictKey, vars?: Record<string, string | number>) => string
}

// Nilai bawaan (dipakai kalau komponen berada di luar PreferencesProvider)
const PrefsContext = createContext<Prefs>({
  lang: 'en',
  theme: 'light',
  setLang: () => {},
  toggleTheme: () => {},
  t: (key, vars) => translate('en', key, vars),
})

// Simpan ke localStorage. try/catch karena bisa ditolak (misalnya mode penyamaran)
const store = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch {}
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // HTML dari server selalu versi Inggris & terang. Script di <head> sudah memasang tema
  // yang tersimpan, lalu bahasa diganti tepat setelah React aktif di browser ("hydration").
  const [lang, setLangState] = useState<Lang>('en')
  const [theme, setTheme] = useState<Theme>('light')
  const [hydrated, setHydrated] = useState(false)

  // Dijalankan sekali saat halaman terbuka: baca pilihan yang sudah dipasang script <head>
  useEffect(() => {
    const root = document.documentElement
    const savedLang = root.dataset.lang
    if (isLang(savedLang)) {
      setLangState(savedLang)
      document.cookie = `${LANG_COOKIE}=${savedLang}; path=/; max-age=31536000; samesite=lax`
    }
    setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light')
    setHydrated(true)
  }, [])

  // Ganti bahasa: simpan ke state, localStorage, dan cookie (berlaku 1 tahun)
  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    store(LANG_STORAGE, next)
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }, [])

  // Setiap bahasa berubah, perbarui atribut <html lang="..."> (penting untuk pembaca layar & SEO)
  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.lang = lang
    root.dataset.lang = lang
    // Tampilkan halaman setelah bahasa yang tersimpan sudah terpasang (lihat globals.css),
    // supaya tidak terlihat teks Inggris sekilas sebelum berganti ke Indonesia
    root.dataset.ready = 'true'
  }, [lang, hydrated])

  // Tukar tema: ubah atribut data-theme di <html>; CSS mode malam membaca atribut ini
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      store(THEME_STORAGE, next)
      return next
    })
  }, [])

  // Fungsi terjemahan yang otomatis memakai bahasa aktif
  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  return <PrefsContext.Provider value={{ lang, theme, setLang, toggleTheme, t }}>{children}</PrefsContext.Provider>
}

// Cara komponen mengambil bahasa/tema: const { t, lang } = usePrefs()
export const usePrefs = () => useContext(PrefsContext)

/** Teks terjemahan untuk dipakai di server component, contoh <T k="news.title" /> */
export function T({ k }: { k: DictKey }) {
  return <>{usePrefs().t(k)}</>
}

/** Tanggal yang formatnya mengikuti bahasa aktif */
export function LocalDate({ iso }: { iso: string | null }) {
  const { lang } = usePrefs()
  return <>{formatDate(iso, lang)}</>
}

// Script kecil yang dijalankan di <head> SEBELUM halaman digambar:
// pasang tema tersimpan (atau ikuti pengaturan HP/laptop kalau belum pernah memilih)
// dan tandai bahasa tersimpan. Tujuannya supaya mode malam tidak berkedip putih.
export const preferencesScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_STORAGE}');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;var l=localStorage.getItem('${LANG_STORAGE}');if(l==='id'||l==='en')d.dataset.lang=l;}catch(e){}})()`
