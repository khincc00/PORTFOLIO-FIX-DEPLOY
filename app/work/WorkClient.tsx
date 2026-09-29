'use client'
import type { DictKey } from '@/lib/i18n'
import { usePrefs } from '@/components/Preferences'
import SiteHeader from '@/components/SiteHeader'
import { DesignList, FilmGrid, ReelGrid, ShortList, WebGrid } from '@/components/PortfolioBlocks'
import { splitPortfolio, type PortfolioItem } from '@/lib/portfolio-items'

/** Full portfolio, every published item in admin order */
export default function WorkClient({ items }: { items: PortfolioItem[] }) {
  const { t } = usePrefs()
  const { designs, reels, films, shorts, webs } = splitPortfolio(items)
  const groups: { id: string; label: DictKey; count: number }[] = [
    { id: 'design', label: 'nav.campaign', count: designs.length },
    { id: 'video', label: 'work.reels', count: reels.length },
    { id: 'youtube', label: 'work.youtube', count: films.length },
    { id: 'tiktok', label: 'work.tiktok', count: shorts.length },
    { id: 'web', label: 'nav.web', count: webs.length },
  ]

  return (
    <main className="studio">
      <SiteHeader />

      <section className="work-page-head section-wrap">
        <div className="section-heading">
          <p className="eyebrow">{t('work.eyebrow')}</p>
          <h1>{t('work.title')}</h1>
          <p className="section-note">{t('work.note')}</p>
        </div>
        <nav className="work-jump" aria-label={t('work.jump')}>
          {groups.filter((g) => g.count > 0).map((g) => <a key={g.id} href={`#${g.id}`}>{t(g.label)} <span>{g.count}</span></a>)}
        </nav>
      </section>

      {designs.length > 0 && <section id="design" className="campaign-section">
        <div className="campaign-inner">
          <div className="section-heading"><p className="eyebrow">{t('campaign.eyebrow')}</p><h2>{t('campaign.title')}</h2><p className="section-note">{t('campaign.note')}</p></div>
          <DesignList items={designs} />
        </div>
      </section>}

      {reels.length > 0 && <section id="video" className="works-section section-wrap">
        <div className="section-heading works-heading"><div><p className="eyebrow">{t('works.eyebrow')}</p><h2>{t('works.title')}</h2></div></div>
        <ReelGrid items={reels} filterable />
      </section>}

      {films.length > 0 && <section id="youtube" className="film-section">
        <div className="section-wrap"><div className="film-heading"><div><p className="eyebrow">{t('yt.eyebrow')}</p><h2>{t('yt.title')}</h2></div><a className="text-link" href="https://www.youtube.com/@khinccofficial" target="_blank" rel="noreferrer">{t('yt.visit')}</a></div>
          <FilmGrid items={films} />
        </div>
      </section>}

      {shorts.length > 0 && <section id="tiktok" className="social-section section-wrap"><div className="section-heading"><p className="eyebrow">{t('social.eyebrow')}</p><h2>{t('social.title')}</h2></div><ShortList items={shorts} /></section>}

      {webs.length > 0 && <section id="web" className="web-section section-wrap">
        <div className="section-heading"><p className="eyebrow">{t('web.eyebrow')}</p><h2>{t('web.title')}</h2><p className="section-note">{t('web.note')}</p></div>
        <WebGrid items={webs} />
      </section>}

      <section className="approach-section"><div><p className="eyebrow">{t('approach.eyebrow')}</p><h2>{t('approach.title')}</h2></div><div><p>{t('approach.body')}</p><a className="button button-light" href="/#contact">{t('approach.cta')}</a></div></section>

      <footer className="studio-footer"><span>{t('footer.text')}</span></footer>
    </main>
  )
}
