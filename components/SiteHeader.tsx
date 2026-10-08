'use client'
/**
 * components/SiteHeader.tsx
 * HEADER (menu atas) yang dipakai di semua halaman publik.
 * Isinya: logo, menu navigasi, tombol bahasa EN/ID, tombol siang/malam, tombol "Hire Me",
 * dan menu burger (☰) untuk layar HP.
 */

import { useEffect, useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import { LANGS, type DictKey } from '@/lib/i18n'

// Daftar menu. key = kunci teks di lib/i18n.ts, href = tujuan link
const links: { key: DictKey; href: string }[] = [
  { key: 'nav.campaign', href: '/work#design' },
  { key: 'nav.works', href: '/work#video' },
  { key: 'nav.web', href: '/work#web' },
  { key: 'nav.news', href: '/berita' },
  { key: 'nav.community', href: '/komunitas' },
  { key: 'nav.contact', href: '#contact' },
]

// Ikon garis satu warna (SVG). currentColor = warnanya ikut warna teks, jadi otomatis
// menyesuaikan mode siang/malam
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

// onHome = true kalau header dipakai di beranda
export default function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const { t, lang, setLang, theme, toggleTheme } = usePrefs()
  const [open, setOpen] = useState(false) // apakah menu burger (HP) sedang terbuka

  // Link seperti #contact hanya ada di beranda. Di halaman lain, diubah jadi /#contact
  // supaya kembali ke beranda lalu loncat ke bagian itu
  const resolve = (href: string) => (href.startsWith('#') && !onHome ? `/${href}` : href)

  // Saat menu HP terbuka: tombol Esc menutup menu, dan halaman di belakangnya tidak bisa di-scroll
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

      {/* Menu untuk layar lebar (disembunyikan di HP lewat CSS) */}
      <nav className="nav-links" aria-label="Main">
        {links.map((l) => (
          <a key={l.key} href={resolve(l.href)}>{t(l.key)}</a>
        ))}
      </nav>

      <div className="nav-tools">
        {/* Tombol pilihan bahasa EN / ID */}
        <div className="lang-switch" role="group" aria-label={t('nav.lang')}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Tombol siang/malam: kedua ikon selalu ada, CSS memilih mana yang terlihat */}
        <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')} title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}>
          <MoonIcon />
          <SunIcon />
        </button>
        <a className="nav-cta" href={resolve('#contact')}>{t('nav.hire')}</a>
        {/* Tombol burger, hanya terlihat di layar kecil. Ikonnya berubah jadi X saat menu terbuka */}
        <button type="button" className="icon-button nav-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="nav-panel" aria-label={t(open ? 'nav.close' : 'nav.menu')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8.5h16M4 15.5h16" />}
          </svg>
        </button>
      </div>

      {/* Panel menu HP. Mengklik link otomatis menutup panel */}
      <div id="nav-panel" className="nav-panel" hidden={!open}>
        {links.map((l) => (
          <a key={l.key} href={resolve(l.href)} onClick={() => setOpen(false)}>{t(l.key)}</a>
        ))}
        <a className="nav-panel-cta" href={resolve('#contact')} onClick={() => setOpen(false)}>{t('nav.hire')} ↗</a>
      </div>
      {/* Lapisan gelap di belakang panel; diklik = menutup menu */}
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </header>
  )
}
