'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { LANG_COOKIE, LANG_STORAGE, THEME_STORAGE, formatDate, isLang, translate, type DictKey, type Lang } from '@/lib/i18n'

type Theme = 'light' | 'dark'

interface Prefs {
  lang: Lang
  theme: Theme
  setLang: (lang: Lang) => void
  toggleTheme: () => void
  t: (key: DictKey, vars?: Record<string, string | number>) => string
}

const PrefsContext = createContext<Prefs>({
  lang: 'en',
  theme: 'light',
  setLang: () => {},
  toggleTheme: () => {},
  t: (key, vars) => translate('en', key, vars),
})

const store = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch {}
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // Server HTML is English/light; the inline head script already applied the saved
  // theme, and we switch language right after hydration.
  const [lang, setLangState] = useState<Lang>('en')
  const [theme, setTheme] = useState<Theme>('light')
  const [hydrated, setHydrated] = useState(false)

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

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    store(LANG_STORAGE, next)
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.lang = lang
    root.dataset.lang = lang
    // Reveal the page only once the saved language is on screen (see globals.css)
    root.dataset.ready = 'true'
  }, [lang, hydrated])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      store(THEME_STORAGE, next)
      return next
    })
  }, [])

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  return <PrefsContext.Provider value={{ lang, theme, setLang, toggleTheme, t }}>{children}</PrefsContext.Provider>
}

export const usePrefs = () => useContext(PrefsContext)

/** Translated text for server components */
export function T({ k }: { k: DictKey }) {
  return <>{usePrefs().t(k)}</>
}

/** Date formatted for the current language */
export function LocalDate({ iso }: { iso: string | null }) {
  const { lang } = usePrefs()
  return <>{formatDate(iso, lang)}</>
}

// Runs in <head> before paint: applies saved/system theme and marks a saved language,
// so night mode never flashes white.
export const preferencesScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_STORAGE}');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;var l=localStorage.getItem('${LANG_STORAGE}');if(l==='id'||l==='en')d.dataset.lang=l;}catch(e){}})()`
