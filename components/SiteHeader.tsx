'use client'

import { useEffect, useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import { LANGS, type DictKey } from '@/lib/i18n'

const links: { key: DictKey; href: string }[] = [
  { key: 'nav.campaign', href: '/work#design' },
  { key: 'nav.works', href: '/work#video' },
  { key: 'nav.web', href: '/work#web' },
  { key: 'nav.news', href: '/berita' },
  { key: 'nav.contact', href: '#contact' },
]

// Single-colour line icons; they inherit the text colour via currentColor
const SunIcon = () => (
  <svg className="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
)

const MoonIcon = () => (
  <svg className="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z" />
  </svg>
)

export default function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const { t, lang, setLang, theme, toggleTheme } = usePrefs()
  const [open, setOpen] = useState(false)

  // Section anchors live on the homepage; elsewhere they point back to it
  const resolve = (href: string) => (href.startsWith('#') && !onHome ? `/${href}` : href)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.classList.add('nav-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('nav-open')
    }
  }, [open])

  return (
    <header className={`studio-nav ${open ? 'is-open' : ''}`}>
      <a className="wordmark" href={onHome ? '#top' : '/'}>
        KHINCC®<span className="wordmark-sub"> / Studio</span>
      </a>

      <nav className="nav-links" aria-label="Main">
        {links.map((l) => (
          <a key={l.key} href={resolve(l.href)}>{t(l.key)}</a>
        ))}
      </nav>

      <div className="nav-tools">
        <div className="lang-switch" role="group" aria-label={t('nav.lang')}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')} title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}>
          <MoonIcon />
          <SunIcon />
        </button>
        <a className="nav-cta" href={resolve('#contact')}>{t('nav.hire')}</a>
        <button type="button" className="icon-button nav-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="nav-panel" aria-label={t(open ? 'nav.close' : 'nav.menu')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8.5h16M4 15.5h16" />}
          </svg>
        </button>
      </div>

      <div id="nav-panel" className="nav-panel" hidden={!open}>
        {links.map((l) => (
          <a key={l.key} href={resolve(l.href)} onClick={() => setOpen(false)}>{t(l.key)}</a>
        ))}
        <a className="nav-panel-cta" href={resolve('#contact')} onClick={() => setOpen(false)}>{t('nav.hire')} ↗</a>
      </div>
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </header>
  )
}
