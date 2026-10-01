'use client'
/**
 * components/PreviewModal.tsx
 * JENDELA PRATINJAU yang muncul saat kartu portfolio diklik.
 *
 * - Desain  → poster tampil besar (utuh, tidak terpotong).
 * - Video   → pemutar Instagram / TikTok / YouTube langsung di dalam website.
 * Di samping media ada judul, deskripsi, link ke platform asli, dan tombol
 * sebelumnya/berikutnya (juga bisa pakai tombol panah ← → di keyboard).
 *
 * Memakai elemen <dialog> bawaan browser: otomatis menangani tombol Esc,
 * menjaga fokus keyboard tetap di dalam jendela, dan menggelapkan latar.
 */
import { useEffect, useRef, useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import { allLinks, coverOf, embedOf, loc, platformName, type PortfolioItem } from '@/lib/portfolio-items'

interface Props {
  items: PortfolioItem[] // daftar karya yang sedang tampil (untuk tombol sebelumnya/berikutnya)
  index: number | null // karya yang dibuka; null = jendela tertutup
  onIndex: (index: number | null) => void
}

export default function PreviewModal({ items, index, onIndex }: Props) {
  const { t, lang } = usePrefs()
  const ref = useRef<HTMLDialogElement>(null)
  const item = index === null ? null : items[index]
  // Tinggi pemutar Instagram dikirim oleh Instagram sendiri (lihat efek di bawah)
  const [igHeight, setIgHeight] = useState<number | null>(null)

  const close = () => onIndex(null)
  const go = (step: number) => index !== null && items.length > 1 && onIndex((index + step + items.length) % items.length)

  // Buka/tutup <dialog> mengikuti `index`, dan kunci scroll halaman selama jendela terbuka
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
    document.documentElement.style.overflow = item ? 'hidden' : ''
    return () => { document.documentElement.style.overflow = '' }
  }, [item])

  // Tombol panah kiri/kanan untuk pindah karya
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Pemutar Instagram mengirim pesan berisi tingginya; dipakai supaya tidak terpotong
  useEffect(() => {
    setIgHeight(null)
    const onMessage = (e: MessageEvent) => {
      if (!/(^|\.)instagram\.com$/.test(new URL(e.origin).hostname)) return
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'MEASURE' && data.details?.height) setIgHeight(Math.ceil(data.details.height))
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [item?.id])

  const embed = item ? embedOf(item) : null
  const cover = item ? coverOf(item) : null
  const media = item?.kind === 'video' ? item.platform || 'video' : 'image'
  const title = item ? loc(item, 'title', lang) : ''
  const platform = item?.kind === 'video' && item.platform ? platformName[item.platform] : ''
  const tag = item ? loc(item, 'tag', lang) : ''

  return (
    // Klik di area gelap (di luar panel) menutup jendela
    <dialog ref={ref} className="pv" onClose={close} onClick={(e) => e.target === ref.current && close()} aria-label={title}>
      {item && (
        <div className={`pv-panel is-${media}`}>
          <div className="pv-media">
            {embed ? (
              // key memaksa pemutar dibuat ulang saat pindah video
              <iframe
                key={item.id}
                src={embed}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
                allowFullScreen
                style={media === 'instagram' && igHeight ? { height: igHeight } : undefined}
              />
            ) : cover ? (
              <img src={cover} alt={item.image_alt || title} />
            ) : null}
          </div>

          <div className="pv-info">
            <span className="pv-meta">
              {/* Contoh: "Instagram · Audio" atau "Campaign design · 2026". Tag yang sama dengan nama platform tidak diulang */}
              {[platform || item.subtitle, tag !== platform ? tag : '', item.kind === 'design' ? item.year : ''].filter(Boolean).join(' · ')}
            </span>
            <h2>{title}</h2>
            {item.kind === 'video' && item.subtitle && <p className="pv-sub">{item.subtitle}</p>}
            {loc(item, 'description', lang) && <p>{loc(item, 'description', lang)}</p>}
            {/* Link ke postingan asli + link tambahan */}
            <div className="pv-links">
              {allLinks(item).map((l, i) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                  {i === 0 && platform ? t('preview.open', { p: platform }) : l.label} ↗
                </a>
              ))}
            </div>
            {items.length > 1 && (
              <div className="pv-nav">
                <button type="button" onClick={() => go(-1)} aria-label={t('preview.prev')}>←</button>
                <span>{(index ?? 0) + 1} / {items.length}</span>
                <button type="button" onClick={() => go(1)} aria-label={t('preview.next')}>→</button>
              </div>
            )}
          </div>

          <button type="button" className="pv-close" onClick={close} aria-label={t('preview.close')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}
    </dialog>
  )
}
