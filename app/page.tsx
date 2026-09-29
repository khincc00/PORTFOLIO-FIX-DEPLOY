'use client'
import { useEffect, useRef, useState } from 'react'
import type { NewsSummary } from '@/lib/news'
import { formatDate, pick, type DictKey } from '@/lib/i18n'
import { usePrefs } from '@/components/Preferences'
import SiteHeader from '@/components/SiteHeader'
import { portfolioSeed, campaignPosters, tiktokReviews, youtubePortfolio, capabilities, marqueeItems, contactInfo, reelDetails, webProjects, experience, cvUrl, type ReelGroup } from '@/lib/portfolio-data'

const pad=(n:number)=>String(n).padStart(2,'0')
const FEATURED_REELS=8
const REEL_GROUPS:ReelGroup[]=['audio','streaming','gaming']
const sequenceImages=[
  {file:'service-branding.jpg',alt:{en:'Design desk with a tablet showing Adobe app icons next to a graphic design book',id:'Meja desain dengan tablet berisi ikon aplikasi Adobe di samping buku desain grafis'}},
  {file:'service-video.jpg',alt:{en:'Video editing timeline with clips and audio tracks',id:'Timeline editing video dengan klip dan trek audio'}},
  {file:'service-audio.jpg',alt:{en:'Dynamic microphone on a boom arm',id:'Mikrofon dinamis pada boom arm'}},
]

const isRecent=(date:string|null)=>Boolean(date && Date.now()-new Date(date).getTime()<14*864e5)

export default function Page(){
  const { t, lang } = usePrefs()
  const [works,setWorks]=useState(portfolioSeed)
  const [news,setNews]=useState<NewsSummary[]>([])
  const [filter,setFilter]=useState<'all'|ReelGroup>('all')
  const [showAllReels,setShowAllReels]=useState(false)
  // Curated copy replaces the short internal notes stored with each reel
  const reels=works.map(w=>{const d=reelDetails[w.reel_id];return {...w,title:d?.title??w.title,desc:d?pick(d.desc,lang):w.description,group:d?.group}})
  const inGroup=filter==='all'?reels:reels.filter(r=>r.group===filter)
  const visibleReels=filter==='all'&&!showAllReels?inGroup.slice(0,FEATURED_REELS):inGroup
  const [form,setForm]=useState({name:'',email:'',project_type:'Branding',budget:'<$300',message:''})
  const [sent,setSent]=useState(false)
  const sequenceRef=useRef<HTMLElement>(null)
  const [sequenceFrame,setSequenceFrame]=useState(0)

  useEffect(()=>{
    fetch('/api/portfolio').then(r=>r.json()).then(d=>{ if(Array.isArray(d) && d.length) setWorks(d)}).catch(()=>{})
    fetch('/api/news?limit=4').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setNews(d)}).catch(()=>{})
  },[])

  useEffect(()=>{
    let frame=0
    const update=()=>{
      const section=sequenceRef.current
      if(!section) return
      const bounds=section.getBoundingClientRect()
      const distance=Math.max(1,bounds.height-window.innerHeight)
      const progress=Math.max(0,Math.min(1,-bounds.top/distance))
      section.style.setProperty('--sequence-progress',String(progress))
      setSequenceFrame(current=>{
        const next=Math.min(2,Math.floor(progress*3))
        return current===next?current:next
      })
    }
    const onScroll=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll',onScroll,{passive:true})
    window.addEventListener('resize',onScroll)
    return ()=>{
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll',onScroll)
      window.removeEventListener('resize',onScroll)
    }
  },[])

  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },{threshold:.12})
    document.querySelectorAll('.scroll-reveal').forEach(section=>observer.observe(section))
    return ()=>observer.disconnect()
  },[])

  const submit = async (e:any)=>{
    e.preventDefault()
    const res = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    if(res.ok){ setSent(true); setForm({name:'',email:'',project_type:'Branding',budget:'<$300',message:''}) }
  }

  return (
    <main className="studio">
      <SiteHeader onHome />

      <section className="hero" id="top">
        <div className="hero-heading">
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <p className="hero-kicker">{t('hero.kicker')}</p>
          <h1><span className="hero-line-light">{t('hero.line1')}</span><br/><span>{t('hero.line2')}</span></h1>
          <p className="hero-intro">{t('hero.intro')}</p>
          <div className="hero-stats"><span>{t('hero.stat1')}</span><span>{t('hero.stat2')}</span><span>{t('hero.stat3')}</span></div>
          <div className="hero-actions"><a className="button button-dark" href="#campaign">{t('hero.cta')}</a><a className="text-link" href={cvUrl} download>{t('hero.cv')} ↓</a></div>
        </div>
      </section>

      <section className="sequence-section" ref={sequenceRef} aria-label={t('cap.eyebrow')}>
        <div className="sequence-stage">
          <div className="sequence-image-wrap">
            {sequenceImages.map((image,index)=><img key={image.file} className={`sequence-image ${sequenceFrame===index?'is-active':''}`} src={`/thumbnails/${image.file}`} alt={pick(image.alt,lang)} />)}
            <div className="sequence-progress"><span/></div>
            <div className="sequence-steps" aria-hidden="true"><i className={sequenceFrame===0?'is-active':''}/><i className={sequenceFrame===1?'is-active':''}/><i className={sequenceFrame===2?'is-active':''}/></div>
          </div>
        </div>
      </section>

      {news.length>0 && <section id="news" className="news-spotlight" aria-label={t('news.live')}>
        <div className="news-spotlight-inner">
          <div className="news-spotlight-head">
            <p className="news-live"><i/>{t('news.live')}</p>
            <a className="text-link" href="/berita">{t('news.viewAll')}</a>
          </div>
          <div className={`news-spotlight-grid ${news.length===1?'is-single':''}`}>
            <a className="news-spot-main" href={`/berita/${news[0].slug}`}>
              <div className="news-cover">{news[0].cover_image?<img src={news[0].cover_image} alt={news[0].title}/>:<span>{news[0].category}</span>}{isRecent(news[0].published_at)&&<b className="news-badge">{t('news.new')}</b>}</div>
              <div className="news-spot-copy">
                <div className="news-meta"><span>{news[0].category}</span><span>{formatDate(news[0].published_at,lang)}</span></div>
                <h2>{news[0].title}</h2>
                <p>{news[0].excerpt}</p>
                <span className="news-spot-cta">{t('news.readMore')} <em>→</em></span>
              </div>
            </a>
            {news.length>1 && <div className="news-spot-list">{news.slice(1).map((n,i)=><a key={n.id} href={`/berita/${n.slug}`}>
              <span className="news-spot-index">{pad(i+2)}</span>
              <div><div className="news-meta"><span>{n.category}</span><span>{formatDate(n.published_at,lang)}</span></div><h3>{n.title}</h3></div>
              {n.cover_image&&<img src={n.cover_image} alt={n.title} loading="lazy"/>}
            </a>)}</div>}
          </div>
        </div>
      </section>}

      <section className="ticker" aria-hidden="true"><div>{marqueeItems.concat(marqueeItems).map((item,i)=><span key={i}>{pick(item,lang)}<b>·</b></span>)}</div></section>

      <section id="campaign" className="campaign-section scroll-reveal">
        <div className="campaign-inner">
          <div className="section-heading"><p className="eyebrow">{t('campaign.eyebrow')}</p><h2>{t('campaign.title')}</h2><p className="section-note">{t('campaign.note')}</p></div>
          <div className="campaign-list">{campaignPosters.map((p,i)=><article className="campaign-row" key={p.title}><span className="campaign-index">{pad(i+1)}</span><div className="campaign-art" aria-hidden="true"/><div className="campaign-copy"><span className="campaign-category">{p.category} · {p.year}</span><h3>{p.title}</h3><p>{pick(p.description,lang)}</p></div><span className="campaign-arrow" aria-hidden="true">↗</span></article>)}</div>
        </div>
      </section>

      <section id="works" className="works-section section-wrap scroll-reveal">
        <div className="section-heading works-heading"><div><p className="eyebrow">{t('works.eyebrow')}</p><h2>{t('works.title')}</h2></div></div>
        <div className="filter-bar" role="group" aria-label="Filter">
          {(['all',...REEL_GROUPS] as const).map(g=><button key={g} onClick={()=>setFilter(g)} className={filter===g?'is-active':''} aria-pressed={filter===g}>{g==='all'?t('works.all'):t(`works.group.${g}` as DictKey)}</button>)}
        </div>
        <div className="work-grid">{visibleReels.map((w,i)=><article className="work-card" key={w.reel_id}>
          <div className="work-art" aria-hidden="true"><span>{pad(i+1)}</span><b/></div>
          <div className="work-meta"><span>{w.group?t(`works.group.${w.group}` as DictKey):w.category}</span><span>Instagram</span></div><h3>{w.title}</h3><p>{w.desc}</p>
          <a href={w.link || `https://www.instagram.com/reel/${w.reel_id}/`} target="_blank" rel="noreferrer">{t('works.view')}</a>
        </article>)}</div>
        {filter==='all' && reels.length>FEATURED_REELS && <button type="button" className="works-more" onClick={()=>setShowAllReels(!showAllReels)} aria-expanded={showAllReels}>{showAllReels?t('works.showLess'):t('works.showAll',{n:reels.length})}</button>}
      </section>

      <section id="youtube" className="film-section scroll-reveal">
        <div className="section-wrap"><div className="film-heading"><div><p className="eyebrow">{t('yt.eyebrow')}</p><h2>{t('yt.title')}</h2></div><a className="text-link" href="https://www.youtube.com/@khinccofficial" target="_blank" rel="noreferrer">{t('yt.visit')}</a></div>
          <div className="film-grid">{youtubePortfolio.map(y=><a className="film-card" key={y.id} href={y.link} target="_blank" rel="noreferrer"><div className="film-thumb"><img src={y.thumb} alt={`${pick(y.about,lang)} — ${y.title}`} loading="lazy"/><span aria-hidden="true">▶</span></div><div><span>{t(`yt.type.${y.type}` as DictKey)}</span><h3>{pick(y.about,lang)}</h3><p className="film-original">{y.title}</p></div><span className="film-arrow" aria-hidden="true">↗</span></a>)}</div>
        </div>
      </section>

      <section className="social-section section-wrap scroll-reveal"><div className="section-heading"><p className="eyebrow">{t('social.eyebrow')}</p><h2>{t('social.title')}</h2></div><div className="social-list">{tiktokReviews.map((r,i)=><a key={r.id} href={r.link} target="_blank" rel="noreferrer"><span>{pad(i+1)}</span><div><h3>{r.title}</h3><p>{r.desc}</p></div><span>{r.platform} ↗</span></a>)}</div></section>

      <section id="web" className="web-section section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{t('web.eyebrow')}</p><h2>{t('web.title')}</h2><p className="section-note">{t('web.note')}</p></div>
        <div className="web-grid">{webProjects.map(w=><article className="web-card" key={w.id}>
          <a className="web-shot" href={w.links[0].href} target="_blank" rel="noreferrer"><img src={w.image} alt={pick(w.alt,lang)} loading="lazy"/></a>
          <div className="web-copy"><span className="web-stack">{w.stack}</span><h3>{w.title}</h3><p>{pick(w.desc,lang)}</p>
            <div className="web-links">{w.links.map(l=><a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
          </div>
        </article>)}</div>
      </section>

      <section id="experience" className="exp-section section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{t('exp.eyebrow')}</p><h2>{t('exp.title')}</h2><p className="section-note">{t('exp.note')} <a className="text-link exp-cv" href={cvUrl} download>{t('exp.cv')}</a></p></div>
        <ol className="exp-list">{experience.map(e=><li className="exp-item" key={pick(e.role,'en')}>
          <span className="exp-period">{pick(e.period,lang)}</span>
          <div><h3>{pick(e.role,lang)}</h3><p className="exp-org">{pick(e.org,lang)}</p>
            {e.points.length>0&&<ul>{e.points.map(pt=><li key={pt.en}>{pick(pt,lang)}</li>)}</ul>}
          </div>
        </li>)}</ol>
      </section>

      <section className="capabilities section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{t('cap.eyebrow')}</p><h2>{t('cap.title')}</h2><p className="section-note">{t('cap.note')}</p></div>
        <div className="service-grid">
          {capabilities.map(c=><article className="service-item" key={c.index}><div className="service-art" aria-hidden="true"><span>{c.index}</span><b>{pick(c.tags,lang)}</b></div><div><span>{c.index} — {pick(c.tags,lang)}</span><h3>{pick(c.title,lang)}</h3><p>{pick(c.desc,lang)}</p></div></article>)}
        </div>
      </section>

      <section className="approach-section scroll-reveal"><div><p className="eyebrow">{t('approach.eyebrow')}</p><h2>{t('approach.title')}</h2></div><div><p>{t('approach.body')}</p><a className="button button-light" href="#contact">{t('approach.cta')}</a></div></section>

      <section id="contact" className="contact-section section-wrap"><div className="contact-copy"><p className="eyebrow">{t('contact.eyebrow')}</p><h2>{t('contact.title')}</h2><p>{t('contact.lede')}</p><div className="contact-meta">{(['contact.meta1','contact.meta2','contact.meta3'] as DictKey[]).map(m=><span key={m}>{t(m)}</span>)}</div><div className="contact-links"><a href={contactInfo.links.email}><span>Email</span><span>{contactInfo.email} ↗</span></a><a href={contactInfo.links.instagram} target="_blank" rel="noreferrer"><span>Instagram</span><span>{contactInfo.instagram} ↗</span></a><a href={contactInfo.links.tiktok} target="_blank" rel="noreferrer"><span>TikTok</span><span>{contactInfo.tiktok} ↗</span></a><a href={contactInfo.links.youtube} target="_blank" rel="noreferrer"><span>YouTube</span><span>{contactInfo.youtube} ↗</span></a><a href={cvUrl} download><span>CV</span><span>{t('hero.cv')} (PDF) ↓</span></a></div></div>
        <form className="contact-form" onSubmit={submit}><label>{t('contact.name')}<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t('contact.name')} required/></label><label>{t('contact.email')}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder={t('contact.email')} required/></label><div className="form-row"><label><span className="sr-only">{t('contact.projectType')}</span><select value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})}>{['Branding','Product Video','Campaign design','Other'].map(v=><option key={v} value={v}>{t(`contact.type.${v}` as DictKey)}</option>)}</select></label><label><span className="sr-only">{t('contact.budget')}</span><select value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}><option>&lt;$300</option><option>$300-$1000</option><option>$1000+</option></select></label></div><label>{t('contact.message')}<textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder={t('contact.messagePh')} required/></label><button className="button button-dark" type="submit">{sent?t('contact.sent'):t('contact.send')}</button><p className="form-note">{contactInfo.email} • (+62) 812 1615 2280</p></form>
      </section>

      <footer className="studio-footer"><span>{t('footer.text')}</span></footer>
    </main>
  )
}
