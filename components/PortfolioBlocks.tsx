'use client'
import { useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import { allLinks, coverOf, loc, type PortfolioItem } from '@/lib/portfolio-items'

// Portfolio lists shared by the homepage (highlighted items) and /work (everything)

export const pad = (n: number) => String(n).padStart(2, '0')

export function DesignList({ items }: { items: PortfolioItem[] }) {
  const { lang } = usePrefs()
  return (
    <div className="campaign-list">{items.map((p, i) => {
      const cover = coverOf(p)
      const Row = p.link ? 'a' : 'article'
      return <Row className="campaign-row" key={p.id} {...(p.link ? { href: p.link, target: '_blank', rel: 'noreferrer' } : {})}>
        <span className="campaign-index">{pad(i + 1)}</span>
        {cover ? <img className="campaign-art campaign-thumb" src={cover} alt={p.image_alt || p.title} loading="lazy" /> : <div className="campaign-art" aria-hidden="true" />}
        <div className="campaign-copy"><span className="campaign-category">{[p.subtitle, p.year].filter(Boolean).join(' · ')}</span><h3>{loc(p, 'title', lang)}</h3><p>{loc(p, 'description', lang)}</p></div>
        <span className="campaign-arrow" aria-hidden="true">{p.link ? '↗' : ''}</span>
      </Row>
    })}</div>
  )
}

/** Instagram Reels grid; with `filterable` it adds the tag filter bar */
export function ReelGrid({ items, filterable = false }: { items: PortfolioItem[]; filterable?: boolean }) {
  const { t, lang } = usePrefs()
  const [filter, setFilter] = useState('all')
  const tags = Array.from(new Map(items.filter((r) => r.tag).map((r) => [r.tag as string, r])).values())
  const shown = filter === 'all' ? items : items.filter((r) => r.tag === filter)
  return (
    <>
      {filterable && tags.length > 1 && <div className="filter-bar" role="group" aria-label="Filter">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'is-active' : ''} aria-pressed={filter === 'all'}>{t('works.all')}</button>
        {tags.map((r) => <button key={r.tag} onClick={() => setFilter(r.tag as string)} className={filter === r.tag ? 'is-active' : ''} aria-pressed={filter === r.tag}>{loc(r, 'tag', lang)}</button>)}
      </div>}
      <div className="work-grid">{shown.map((w, i) => {
        const cover = coverOf(w)
        return <article className="work-card" key={w.id}>
          <div className={`work-art ${cover ? 'has-cover' : ''}`} aria-hidden={!cover}>{cover ? <img src={cover} alt={w.image_alt || w.title} loading="lazy" /> : <b />}<span>{pad(i + 1)}</span></div>
          <div className="work-meta"><span>{loc(w, 'tag', lang)}</span><span>Instagram</span></div><h3>{loc(w, 'title', lang)}</h3><p>{loc(w, 'description', lang)}</p>
          {w.link && <a href={w.link} target="_blank" rel="noreferrer">{t('works.view')}</a>}
        </article>
      })}</div>
    </>
  )
}

export function FilmGrid({ items }: { items: PortfolioItem[] }) {
  const { lang } = usePrefs()
  return (
    <div className="film-grid">{items.map((y) => {
      const cover = coverOf(y)
      return <a className="film-card" key={y.id} href={y.link || undefined} target="_blank" rel="noreferrer">
        <div className="film-thumb">{cover && <img src={cover} alt={y.image_alt || loc(y, 'title', lang)} loading="lazy" />}<span aria-hidden="true">▶</span></div>
        <div><span>{loc(y, 'tag', lang)}</span><h3>{loc(y, 'title', lang)}</h3>{y.subtitle && <p className="film-original">{y.subtitle}</p>}</div>
        <span className="film-arrow" aria-hidden="true">↗</span>
      </a>
    })}</div>
  )
}

export function ShortList({ items }: { items: PortfolioItem[] }) {
  const { lang } = usePrefs()
  return (
    <div className="social-list">{items.map((r, i) => <a key={r.id} href={r.link || undefined} target="_blank" rel="noreferrer">
      <span>{pad(i + 1)}</span><div><h3>{loc(r, 'title', lang)}</h3><p>{loc(r, 'description', lang)}</p></div><span>TikTok ↗</span>
    </a>)}</div>
  )
}

export function WebGrid({ items }: { items: PortfolioItem[] }) {
  const { lang } = usePrefs()
  return (
    <div className="web-grid">{items.map((w) => {
      const cover = coverOf(w)
      return <article className="web-card" key={w.id}>
        {cover && <a className="web-shot" href={w.link || undefined} target="_blank" rel="noreferrer"><img src={cover} alt={w.image_alt || w.title} loading="lazy" /></a>}
        <div className="web-copy">{w.subtitle && <span className="web-stack">{w.subtitle}</span>}<h3>{loc(w, 'title', lang)}</h3><p>{loc(w, 'description', lang)}</p>
          <div className="web-links">{allLinks(w).map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
        </div>
      </article>
    })}</div>
  )
}
