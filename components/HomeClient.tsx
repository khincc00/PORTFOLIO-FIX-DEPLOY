'use client'
/**
 * components/HomeClient.tsx → TAMPILAN BERANDA (dipanggil dari app/page.tsx).
 *
 * 'use client' = komponen ini berjalan di browser karena ada bagian interaktif:
 * animasi saat scroll, sorotan berita yang dimuat belakangan, dan form kontak.
 *
 * Urutan bagian dari atas ke bawah:
 *   Header → Hero (judul besar) → Foto berganti saat scroll → Sorotan berita →
 *   Teks berjalan → Design → Reels → YouTube → TikTok → Web → Tombol "Explore the full portfolio" →
 *   Experience → Services → Approach → Kontak → Footer
 * Bagian portfolio hanya berisi karya yang di-highlight (★) di admin.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { NewsSummary } from '@/lib/news'
import { formatDate, pick, type DictKey } from '@/lib/i18n'
import { usePrefs } from '@/components/Preferences'
import SiteHeader from '@/components/SiteHeader'
import { capabilities, marqueeItems, contactInfo, experience, cvUrl } from '@/lib/portfolio-data'
import { splitPortfolio, type PortfolioItem, type PortfolioTotals } from '@/lib/portfolio-items'
import { DesignList, FilmGrid, ReelGrid, ShortList, WebGrid, pad } from '@/components/PortfolioBlocks'

// Tiga foto yang berganti saat pengunjung scroll di bawah hero (file ada di public/thumbnails)
const sequenceImages=[
  {file:'service-branding.jpg',alt:{en:'Design desk with a tablet showing Adobe app icons next to a graphic design book',id:'Meja desain dengan tablet berisi ikon aplikasi Adobe di samping buku desain grafis'}},
  {file:'service-video.jpg',alt:{en:'Video editing timeline with clips and audio tracks',id:'Timeline editing video dengan klip dan trek audio'}},
  {file:'service-audio.jpg',alt:{en:'Dynamic microphone on a boom arm',id:'Mikrofon dinamis pada boom arm'}},
]

// true kalau berita terbit kurang dari 14 hari lalu (untuk label "New"). 864e5 = 86.400.000 ms = 1 hari
const isRecent=(date:string|null)=>Boolean(date && Date.now()-new Date(date).getTime()<14*864e5)

/** items = karya ber-highlight saja; totals = jumlah SEMUA karya per bagian (untuk link "See all") */
export default function HomeClient({ items, totals }: { items: PortfolioItem[]; totals: PortfolioTotals }){
  const { t, lang } = usePrefs()
  const [news,setNews]=useState<NewsSummary[]>([])
  // Karya sudah urut sesuai posisi di Admin → Portfolio; di sini dikelompokkan per bagian
  const { designs, reels, films, shorts, webs } = splitPortfolio(items)
  // Bagian tanpa highlight tidak ditampilkan, jadi nomor bagian (01, 02, ...) dihitung saat menggambar.
  // Setiap kali eyebrow() dipanggil, nomornya naik satu
  let sectionNo=0
  const eyebrow=(key:DictKey)=>`${pad(++sectionNo)} — ${t(key)}`
  // Link "See all N →" ke /work, hanya muncul kalau masih ada karya yang tidak ditampilkan di beranda
  const seeAll=(count:number,shown:number,href:string)=>count>shown&&<a className="text-link see-all" href={href}>{t('work.seeAll',{n:count})} →</a>
  // Isi form kontak dan status terkirim
  const [form,setForm]=useState({name:'',email:'',project_type:'Branding',budget:'<$300',message:''})
  const [sent,setSent]=useState(false)
  // Referensi ke bagian foto berganti, dan foto mana yang sedang tampil (0, 1, atau 2)
  const sequenceRef=useRef<HTMLElement>(null)
  const [sequenceFrame,setSequenceFrame]=useState(0)

  // Ambil 4 berita terbaru setelah halaman terbuka (supaya beranda tetap cepat tampil)
  useEffect(()=>{
    fetch('/api/news?limit=4').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setNews(d)}).catch(()=>{})
  },[])

  // Efek foto berganti: hitung seberapa jauh bagian ini sudah di-scroll (0 sampai 1),
  // lalu pilih foto ke-1, 2, atau 3. requestAnimationFrame membuat perhitungan
  // hanya dilakukan sekali per frame layar supaya scroll tetap halus
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
    // Bersihkan listener saat komponen ditutup (mencegah kebocoran memori)
    return ()=>{
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll',onScroll)
      window.removeEventListener('resize',onScroll)
    }
  },[])

  // Animasi muncul: setiap bagian ber-class .scroll-reveal mendapat class .is-visible
  // saat 12% bagiannya terlihat di layar (CSS yang membuat efek memudar masuk)
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

  // Kirim form kontak ke /api/contact. preventDefault mencegah halaman reload
  const submit = async (e:any)=>{
    e.preventDefault()
    const res = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    if(res.ok){ setSent(true); setForm({name:'',email:'',project_type:'Branding',budget:'<$300',message:''}) }
  }

  return (
    <main className="studio">
      <SiteHeader onHome />

      {/* ===== HERO: judul besar, statistik, tombol ke karya & download CV ===== */}
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

      {/* ===== FOTO BERGANTI SAAT SCROLL ===== */}
      <section className="sequence-section" ref={sequenceRef} aria-label={t('cap.eyebrow')}>
        <div className="sequence-stage">
          <div className="sequence-image-wrap">
            {sequenceImages.map((image,index)=><img key={image.file} className={`sequence-image ${sequenceFrame===index?'is-active':''}`} src={`/thumbnails/${image.file}`} alt={pick(image.alt,lang)} />)}
            <div className="sequence-progress"><span/></div>
            <div className="sequence-steps" aria-hidden="true"><i className={sequenceFrame===0?'is-active':''}/><i className={sequenceFrame===1?'is-active':''}/><i className={sequenceFrame===2?'is-active':''}/></div>
          </div>
        </div>
      </section>

      {/* ===== SOROTAN BERITA: 1 berita besar + daftar kecil. Hanya tampil kalau ada berita ===== */}
      {news.length>0 && <section id="news" className="news-spotlight" aria-label={t('news.live')}>
        <div className="news-spotlight-inner">
          <div className="news-spotlight-head">
            <p className="news-live"><i/>{t('news.live')}</p>
            <Link className="text-link" href="/berita">{t('news.viewAll')}</Link>
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

      {/* ===== TEKS BERJALAN (diulang 2x supaya animasinya menyambung tanpa jeda) ===== */}
      <section className="ticker" aria-hidden="true"><div>{marqueeItems.concat(marqueeItems).map((item,i)=><span key={i}>{pick(item,lang)}<b>·</b></span>)}</div></section>

      {/* ===== PORTFOLIO (hanya karya ber-highlight). Tampilan kartunya ada di components/PortfolioBlocks.tsx ===== */}
      {designs.length>0&&<section id="campaign" className="campaign-section scroll-reveal">
        <div className="campaign-inner">
          <div className="section-heading"><p className="eyebrow">{eyebrow('campaign.eyebrow')}</p><h2>{t('campaign.title')}</h2><p className="section-note">{t('campaign.note')}</p>{seeAll(totals.designs,designs.length,'/work#design')}</div>
          <DesignList items={designs}/>
        </div>
      </section>}

      {/* Instagram Reels */}
      {reels.length>0&&<section id="works" className="works-section section-wrap scroll-reveal">
        <div className="section-heading works-heading"><div><p className="eyebrow">{eyebrow('works.eyebrow')}</p><h2>{t('works.title')}</h2></div>{seeAll(totals.reels,reels.length,'/work#video')}</div>
        <ReelGrid items={reels}/>
      </section>}

      {/* YouTube. Kalau semua video sudah tampil, link "See all" diganti link ke channel YouTube */}
      {films.length>0&&<section id="youtube" className="film-section scroll-reveal">
        <div className="section-wrap"><div className="film-heading"><div><p className="eyebrow">{eyebrow('yt.eyebrow')}</p><h2>{t('yt.title')}</h2></div>{seeAll(totals.films,films.length,'/work#youtube')||<a className="text-link" href="https://www.youtube.com/@khinccofficial" target="_blank" rel="noreferrer">{t('yt.visit')}</a>}</div>
          <FilmGrid items={films}/>
        </div>
      </section>}

      {/* TikTok */}
      {shorts.length>0&&<section className="works-section section-wrap scroll-reveal"><div className="section-heading works-heading"><div><p className="eyebrow">{eyebrow('social.eyebrow')}</p><h2>{t('social.title')}</h2></div>{seeAll(totals.shorts,shorts.length,'/work#tiktok')}</div><ShortList items={shorts}/></section>}

      {/* Web & front-end */}
      {webs.length>0&&<section id="web" className="web-section section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{eyebrow('web.eyebrow')}</p><h2>{t('web.title')}</h2><p className="section-note">{t('web.note')}</p>{seeAll(totals.webs,webs.length,'/work#web')}</div>
        <WebGrid items={webs}/>
      </section>}

      {/* Tombol besar ke halaman /work + jumlah total karya */}
      <section className="work-cta section-wrap scroll-reveal"><a href="/work"><span>{t('work.cta')}</span><em aria-hidden="true">→</em><small>{t('work.count',{n:Object.values(totals).reduce((a,b)=>a+b,0)})}</small></a></section>

      {/* ===== PENGALAMAN KERJA (data dari lib/portfolio-data.ts) ===== */}
      <section id="experience" className="exp-section section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{eyebrow('exp.eyebrow')}</p><h2>{t('exp.title')}</h2><p className="section-note">{t('exp.note')} <a className="text-link exp-cv" href={cvUrl} download>{t('exp.cv')}</a></p></div>
        <ol className="exp-list">{experience.map(e=><li className="exp-item" key={pick(e.role,'en')}>
          <span className="exp-period">{pick(e.period,lang)}</span>
          <div><h3>{pick(e.role,lang)}</h3><p className="exp-org">{pick(e.org,lang)}</p>
            {e.points.length>0&&<ul>{e.points.map(pt=><li key={pt.en}>{pick(pt,lang)}</li>)}</ul>}
          </div>
        </li>)}</ol>
      </section>

      {/* ===== LAYANAN ===== */}
      <section className="capabilities section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">{eyebrow('cap.eyebrow')}</p><h2>{t('cap.title')}</h2><p className="section-note">{t('cap.note')}</p></div>
        <div className="service-grid">
          {capabilities.map(c=><article className="service-item" key={c.index}><div className="service-art" aria-hidden="true"><span>{c.index}</span><b>{pick(c.tags,lang)}</b></div><div><span>{c.index} — {pick(c.tags,lang)}</span><h3>{pick(c.title,lang)}</h3><p>{pick(c.desc,lang)}</p></div></article>)}
        </div>
      </section>

      {/* ===== APPROACH: ajakan kerja sama ===== */}
      <section className="approach-section scroll-reveal"><div><p className="eyebrow">{eyebrow('approach.eyebrow')}</p><h2>{t('approach.title')}</h2></div><div><p>{t('approach.body')}</p><a className="button button-light" href="#contact">{t('approach.cta')}</a></div></section>

      {/* ===== KONTAK: link media sosial + form pesan ===== */}
      <section id="contact" className="contact-section section-wrap"><div className="contact-copy"><p className="eyebrow">{t('contact.eyebrow')}</p><h2>{t('contact.title')}</h2><p>{t('contact.lede')}</p><div className="contact-meta">{(['contact.meta1','contact.meta2','contact.meta3'] as DictKey[]).map(m=><span key={m}>{t(m)}</span>)}</div><div className="contact-links"><a href={contactInfo.links.email}><span>Email</span><span>{contactInfo.email} ↗</span></a><a href={contactInfo.links.instagram} target="_blank" rel="noreferrer"><span>Instagram</span><span>{contactInfo.instagram} ↗</span></a><a href={contactInfo.links.tiktok} target="_blank" rel="noreferrer"><span>TikTok</span><span>{contactInfo.tiktok} ↗</span></a><a href={contactInfo.links.youtube} target="_blank" rel="noreferrer"><span>YouTube</span><span>{contactInfo.youtube} ↗</span></a><a href={cvUrl} download><span>CV</span><span>{t('hero.cv')} (PDF) ↓</span></a></div></div>
        <form className="contact-form" onSubmit={submit}><label>{t('contact.name')}<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t('contact.name')} required/></label><label>{t('contact.email')}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder={t('contact.email')} required/></label><div className="form-row"><label><span className="sr-only">{t('contact.projectType')}</span><select value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})}>{['Branding','Product Video','Campaign design','Other'].map(v=><option key={v} value={v}>{t(`contact.type.${v}` as DictKey)}</option>)}</select></label><label><span className="sr-only">{t('contact.budget')}</span><select value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}><option>&lt;$300</option><option>$300-$1000</option><option>$1000+</option></select></label></div><label>{t('contact.message')}<textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder={t('contact.messagePh')} required/></label><button className="button button-dark" type="submit">{sent?t('contact.sent'):t('contact.send')}</button><p className="form-note">{contactInfo.email} • (+62) 812 1615 2280</p></form>
      </section>

      <footer className="studio-footer"><span>{t('footer.text')}</span></footer>
    </main>
  )
}
