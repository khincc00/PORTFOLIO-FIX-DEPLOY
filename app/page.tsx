'use client'
import { useEffect, useRef, useState } from 'react'
import { portfolioSeed, campaignPosters, tiktokReviews, youtubePortfolio, capabilities, marqueeItems, contactInfo } from '@/lib/portfolio-data'

export default function Page(){
  const [works,setWorks]=useState(portfolioSeed)
  const [filter,setFilter]=useState('All')
  const cats=['All',...Array.from(new Set(portfolioSeed.map(p=>p.category)))]
  const filtered = filter==='All'?works:works.filter(w=>w.category===filter)
  const [form,setForm]=useState({name:'',email:'',project_type:'Branding',budget:'<500k',message:''})
  const [sent,setSent]=useState(false)
  const sequenceRef=useRef<HTMLElement>(null)
  const [sequenceFrame,setSequenceFrame]=useState(0)

  useEffect(()=>{
    fetch('/api/portfolio').then(r=>r.json()).then(d=>{ if(Array.isArray(d) && d.length) setWorks(d)}).catch(()=>{})
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
    if(res.ok){ setSent(true); setForm({name:'',email:'',project_type:'Branding',budget:'<500k',message:''}) }
  }

  return (
    <main className="studio">
      <nav className="studio-nav">
        <a className="wordmark" href="#top">KHINCC® / Studio</a>
        <div className="nav-links"><a href="#campaign">Campaign</a><a href="#works">Works</a><a href="#youtube">YouTube</a><a href="#contact">Contact</a></div>
        <a className="nav-cta" href="#contact">Hire Me</a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-heading">
          <p className="eyebrow">SANGATTA • WITA UTC+8 • FULLY REMOTE • Open for 2026</p>
          <p className="hero-kicker">Creative Multimedia / Indonesia</p>
          <h1><span className="hero-line-light">Crafting standout brands &</span><br/><span>content — 6+ years</span></h1>
          <p className="hero-intro">I help brands and businesses build digital experiences that feel clear, distinctive, and worth remembering. Multimedia Creator @khinccofficial — 6+ tahun bikin brand identity, marketing collateral, dan short-form product video.</p>
          <div className="hero-stats"><span>50+ Assets TNI AL</span><span>32+ Projects</span><span>1,971 Followers</span></div>
          <div className="hero-actions"><a className="button button-dark" href="#works">View selected work ↗</a><a className="text-link" href="#contact">Start a conversation</a></div>
        </div>
      </section>

      <section className="sequence-section" ref={sequenceRef} aria-label="Portfolio image sequence">
        <div className="sequence-stage">
          <div className="sequence-image-wrap">
            {['service-branding.jpg','service-video.jpg','service-audio.jpg'].map((image,index)=><img key={image} className={`sequence-image ${sequenceFrame===index?'is-active':''}`} src={`/thumbnails/${image}`} alt="" aria-hidden="true" />)}
            <div className="sequence-progress"><span/></div>
            <div className="sequence-steps" aria-hidden="true"><i className={sequenceFrame===0?'is-active':''}/><i className={sequenceFrame===1?'is-active':''}/><i className={sequenceFrame===2?'is-active':''}/></div>
          </div>
        </div>
      </section>

      <section className="ticker" aria-label="Studio capabilities"><div>{marqueeItems.concat(marqueeItems).map((item,i)=><span key={i}>{item}<b>·</b></span>)}</div></section>

      <section className="capabilities section-wrap scroll-reveal">
        <div className="section-heading"><p className="eyebrow">02 — Capabilities</p><h2>Quietly thorough, from idea to output.</h2><p className="section-note">One studio, one thread — strategy, visuals, and the edit that pulls it together.</p></div>
        <div className="service-grid">
          {capabilities.map(c=><article className="service-item" key={c.index}><div className="service-art"><span>{c.index}</span><b>{c.tags}</b></div><div><span>{c.index} — {c.tags}</span><h3>{c.title}</h3><p>{c.desc}</p></div></article>)}
        </div>
      </section>

      <section id="campaign" className="campaign-section scroll-reveal">
        <div className="campaign-inner">
          <div className="section-heading"><p className="eyebrow">01 — Portfolio / Campaign Design (NEW from old web)</p><h2>Ideas made visible.</h2><p className="section-note">5 campaign posters yang belum ada di web Next.js sebelumnya — dari HTML lama.</p></div>
          <div className="campaign-list">{campaignPosters.map((p,i)=><article className="campaign-row" key={p.title}><span className="campaign-index">0{i+1}</span><div className="campaign-art" aria-hidden="true"/><div className="campaign-copy"><span className="campaign-category">{p.category} · {p.year}</span><h3>{p.title}</h3><p>{p.description}</p><span className="campaign-alt">Alt: {p.alt}</span></div><span className="campaign-arrow">↗</span></article>)}</div>
        </div>
      </section>

      <section id="works" className="works-section section-wrap scroll-reveal">
        <div className="section-heading works-heading"><div><p className="eyebrow">03 / SELECTED WORKS • 14 CURATED (existing)</p><h2>Gear reviews that convert.</h2></div></div>
        <div className="filter-bar" aria-label="Filter work by category">{cats.map(c=><button key={c} onClick={()=>setFilter(c)} className={filter===c?'is-active':''} aria-pressed={filter===c}>{c}</button>)}</div>
        <div className="work-grid">{filtered.map((w,i)=><article className="work-card" key={w.reel_id}>
          <div className="work-art" aria-hidden="true"><span>0{String(i+1).padStart(1,'0')}</span><b/></div>
          <div className="work-meta"><span>{w.category}</span><span>{w.likes} likes</span></div><h3>{w.title}</h3><p>{w.description}</p>
          <a href={w.link || `https://www.instagram.com/reel/${w.reel_id}/`} target="_blank" rel="noreferrer">View Reel</a>
        </article>)}</div>
      </section>

      <section id="youtube" className="film-section scroll-reveal">
        <div className="section-wrap"><div className="film-heading"><div><p className="eyebrow">Moving image / YouTube (NEW - 10 videos from old web)</p><h2>More work, in motion.</h2></div><a className="text-link" href="https://www.youtube.com/@khinccofficial" target="_blank" rel="noreferrer">Visit YouTube ↗</a></div>
          <div className="film-grid">{youtubePortfolio.map(y=><a className="film-card" key={y.id} href={y.link} target="_blank" rel="noreferrer"><div className="film-thumb"><img src={y.thumb} alt="" loading="lazy"/><span>▶</span></div><div><span>{y.type}</span><h3>{y.title}</h3></div><span className="film-arrow">↗</span></a>)}</div>
        </div>
      </section>

      <section className="social-section section-wrap scroll-reveal"><div className="section-heading"><p className="eyebrow">Social editing / TikTok (NEW from old web - 4 missing)</p><h2>Designed for the feed.</h2></div><div className="social-list">{tiktokReviews.map((t,i)=><a key={t.id} href={t.link} target="_blank" rel="noreferrer"><span>0{i+1}</span><div><h3>{t.title}</h3><p>{t.desc}</p></div><span>{t.platform} ↗</span></a>)}</div></section>

      <section className="approach-section scroll-reveal"><div><p className="eyebrow">03 — Approach</p><h2>Good design makes room for better ideas.</h2></div><div><p>My process starts with curiosity, honest conversations, and an eye for the small details. The final work should look considered and feel effortless to use.</p><a className="button button-light" href="#contact">Let’s work together ↗</a></div></section>

      <section id="contact" className="contact-section section-wrap"><div className="contact-copy"><p className="eyebrow">{contactInfo.eyebrow}</p><h2>{contactInfo.title}</h2><p>{contactInfo.lede}</p><div className="contact-meta">{contactInfo.meta.map(m=><span key={m}>{m}</span>)}</div><div className="contact-links"><a href={contactInfo.links.email}><span>Email</span><span>{contactInfo.email} ↗</span></a><a href={contactInfo.links.instagram} target="_blank" rel="noreferrer"><span>Instagram</span><span>{contactInfo.instagram} ↗</span></a><a href={contactInfo.links.tiktok} target="_blank" rel="noreferrer"><span>TikTok</span><span>{contactInfo.tiktok} ↗</span></a><a href={contactInfo.links.youtube} target="_blank" rel="noreferrer"><span>YouTube</span><span>{contactInfo.youtube} ↗</span></a></div></div>
        <form className="contact-form" onSubmit={submit}><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" required/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" required/></label><div className="form-row"><label><span className="sr-only">Project type</span><select value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})}><option>Branding</option><option>Product Video</option><option>Campaign design</option><option>Other</option></select></label><label><span className="sr-only">Budget</span><select value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}><option>&lt;$300</option><option>$300-$1000</option><option>$1000+</option></select></label></div><label>Tell me about your project<textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Share the goal, the timeline, and anything you already have." required/></label><button className="button button-dark" type="submit">{sent?'Terkirim ✓':'Send message ↗'}</button><p className="form-note">Replies in 2–3 days • Response &lt;24h async • taufiqsholikhin@gmail.com • (+62) 812 1615 2280</p></form>
      </section>

      <footer className="studio-footer"><span>© 2026 Khincc Studio • Taufiq Sholikhin - Remote Designer &amp; Video Editor | Khinccofficial • Indonesia • Made with intention.</span></footer>
    </main>
  )
}