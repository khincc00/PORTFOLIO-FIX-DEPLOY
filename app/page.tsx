'use client'
import { useEffect, useState } from 'react'
import { portfolioSeed, campaignPosters, tiktokReviews, youtubePortfolio, capabilities, marqueeItems, contactInfo } from '@/lib/portfolio-data'

export default function Page(){
  const [works,setWorks]=useState(portfolioSeed)
  const [filter,setFilter]=useState('All')
  const cats=['All',...Array.from(new Set(portfolioSeed.map(p=>p.category)))]
  const filtered = filter==='All'?works:works.filter(w=>w.category===filter)
  const [form,setForm]=useState({name:'',email:'',project_type:'Branding',budget:'<500k',message:''})
  const [sent,setSent]=useState(false)

  useEffect(()=>{
    fetch('/api/portfolio').then(r=>r.json()).then(d=>{ if(Array.isArray(d) && d.length) setWorks(d)}).catch(()=>{})
  },[])

  const submit = async (e:any)=>{
    e.preventDefault()
    const res = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    if(res.ok){ setSent(true); setForm({name:'',email:'',project_type:'Branding',budget:'<500k',message:''}) }
  }

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.06] px-6 md:px-10 h-[56px] flex items-center justify-between">
        <div className="font-semibold tracking-tight">KHINCC® / Studio</div>
        <div className="hidden md:flex gap-6 text-[13px] text-[#86868B]"><a href="#campaign">Campaign</a><a href="#works">Works</a><a href="#youtube">YouTube</a><a href="#contact">Contact</a></div>
        <a href="#contact" className="bg-black text-white rounded-full px-4 py-1.5 text-[13px]">Hire Me</a>
      </nav>

      {/* HERO - merged from old index.html */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 pb-16">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">SANGATTA • WITA UTC+8 • FULLY REMOTE • Open for 2026</div>
          <p className="mt-3 text-[11px] tracking-[0.15em] text-[#86868B] uppercase">Creative Multimedia / Indonesia</p>
          <h1 className="mt-6 text-[48px] md:text-[84px] leading-[0.9] tracking-[-0.04em]"><span className="font-light">Crafting standout brands &</span><br/><span className="font-semibold">content — 6+ years</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-7 text-[#515154]">I help brands and businesses build digital experiences that feel clear, distinctive, and worth remembering. Multimedia Creator @khinccofficial — 6+ tahun bikin brand identity, marketing collateral, dan short-form product video.</p>
          <div className="mt-6 flex justify-center gap-2 text-[12px]"><span className="bg-[#F5F5F7] rounded-full px-3 py-1">50+ Assets TNI AL</span><span className="bg-[#F5F5F7] rounded-full px-3 py-1">32+ Projects</span><span className="bg-[#F5F5F7] rounded-full px-3 py-1">1,971 Followers</span></div>
          <div className="mt-8 flex justify-center gap-3"><a href="#works" className="bg-black text-white rounded-full px-6 py-3 text-sm">View selected work ↗</a><a href="#contact" className="bg-[#F5F5F7] rounded-full px-6 py-3 text-sm">Start a conversation</a></div>
        </div>
      </section>

      {/* MARQUEE from old web - NEW */}
      <section className="border-y border-black/[0.06] py-4 overflow-hidden bg-white">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {marqueeItems.concat(marqueeItems).map((item,i)=><span key={i} className="text-[13px] tracking-[0.1em] uppercase text-[#86868B]">• {item}</span>)}
        </div>
      </section>

      {/* CAPABILITIES 01-04 from old web - NEW */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <div className="flex justify-between">
          <div><p className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">02 — Capabilities</p><h2 className="mt-2 text-[28px] md:text-[40px] font-semibold tracking-tight">Quietly thorough, from idea to output.</h2></div>
          <p className="hidden md:block max-w-[280px] text-[14px] text-[#86868B]">One studio, one thread — strategy, visuals, and the edit that pulls it together.</p>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-0 border-t">
          {capabilities.map((c,i)=><div key={i} className="border-b py-6 flex gap-6"><span className="text-[11px] text-[#86868B]">{c.index}</span><div className="flex-1"><h3 className="font-semibold">{c.title}</h3><p className="mt-1 text-[13px] text-[#86868B]">{c.desc}</p></div><span className="text-[11px] text-[#86868B] hidden md:block">{c.tags}</span></div>)}
        </div>
      </section>

      {/* CAMPAIGN POSTERS from portfolio.html - NEW - missing before */}
      <section id="campaign" className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 bg-[#F5F5F7] rounded-[32px] my-8">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">01 — Portfolio / Campaign Design (NEW from old web)</div>
        <h2 className="mt-3 text-[32px] md:text-[48px] tracking-tight font-semibold">Ideas made visible.</h2>
        <p className="mt-2 text-[#86868B]">5 campaign posters yang belum ada di web Next.js sebelumnya — dari HTML lama.</p>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {campaignPosters.map((p,i)=><div key={i} className="rounded-[24px] bg-white border p-5">
            <div className="h-40 rounded-[16px] bg-gradient-to-br from-[#E8E8ED] to-white flex items-center justify-center text-xs text-[#86868B]">IMG: {p.image}</div>
            <div className="mt-4 flex justify-between text-[11px] text-[#86868B]"><span>{p.category}</span><span>{p.year}</span></div>
            <h3 className="mt-2 font-semibold">{p.title}</h3>
            <p className="text-[12px] text-[#86868B]">{p.description}</p>
            <p className="text-[10px] text-[#86868B] mt-1">Alt: {p.alt}</p>
          </div>)}
        </div>
      </section>

{/* YOUTUBE GRID - NEW from old web 10 videos */}
      <section id="youtube" className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 bg-white text-black rounded-[32px]">
        <div className="flex justify-between items-end">
          <div><p className="text-[11px] tracking-[0.15em] text-white/50 uppercase">Moving image / YouTube (NEW - 10 videos from old web)</p><h2 className="mt-3 text-[32px] md:text-[48px] font-semibold">More work, in motion.</h2></div>
          <a href="https://www.youtube.com/@khinccofficial" target="_blank" className="hidden md:inline-block bg-white text-black rounded-full px-5 py-2 text-[13px]">Visit YouTube ↗</a>
        </div>
        <div className="mt-8 grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {youtubePortfolio.map((y,i)=><a key={i} href={y.link} target="_blank" className="bg-white/10 rounded-[16px] p-3 hover:bg-white/20 transition">
            <img src={y.thumb} alt={y.title} className="rounded-[12px] w-full aspect-video object-cover"/>
            <h3 className="mt-3 text-[13px] font-medium leading-tight">{y.title}</h3>
            <span className="text-[11px] text-white/50">{y.type}</span>
          </a>)}
        </div>
      </section>

      {/* SELECTED WORKS - existing 14 reels */}
      <section id="works" className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">03 / SELECTED WORKS • 14 CURATED (existing)</div>
        <h2 className="mt-3 text-[32px] md:text-[48px] tracking-tight font-semibold">Gear reviews that convert.</h2>
        <div className="mt-6 flex gap-2 overflow-auto pb-2">{cats.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full px-4 py-1.5 text-[13px] border ${filter===c?'bg-black text-white border-black':'bg-white border-black/10'}`}>{c}</button>)}</div>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {filtered.map((w,i)=>(
            <div key={i} className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition">
              <div className="flex justify-between text-[11px] text-[#86868B]"><span>0{String(i+1).padStart(1,'0')}</span><span>♥ {w.likes}</span><span className="bg-[#F5F5F7] rounded-full px-2 py-0.5">{w.category}</span></div>
              <div className="mt-4 h-24 rounded-[16px] bg-gradient-to-br from-[#F5F5F7] to-white border border-black/[0.04] flex items-center justify-center text-[#86868B] text-xs">{w.category} Preview</div>
              <h3 className="mt-4 font-semibold tracking-tight">{w.title}</h3>
              <p className="mt-1 text-[13px] text-[#86868B]">{w.description}</p>
              <a href={w.link || `https://www.instagram.com/reel/${w.reel_id}/`} target="_blank" className="mt-4 inline-block bg-black text-white rounded-full px-4 py-2 text-[12px]">View Reel</a>
            </div>
          ))}
        </div>
      </section>

      {/* TIKTOK REVIEWS - NEW from old portfolio.html social-section */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">Social editing / TikTok (NEW from old web - 4 missing)</div>
        <h2 className="mt-3 text-[32px] font-semibold">Designed for the feed.</h2>
        <div className="mt-8 grid md:grid-cols-4 gap-5">
          {tiktokReviews.map((t,i)=><a key={i} href={t.link} target="_blank" className="rounded-[24px] bg-white border p-5 hover:-translate-y-1 transition block">
            <div className="h-32 rounded-[16px] bg-black/5 flex items-center justify-center text-xs">{t.thumb}</div>
            <div className="mt-3 text-[11px] text-[#86868B]">{t.platform}</div>
            <h3 className="font-semibold mt-1">{t.title}</h3>
            <p className="text-[12px] text-[#86868B]">{t.desc}</p>
            <span className="text-[11px] mt-2 inline-block">Open video ↗</span>
          </a>)}
        </div>
      </section>


      {/* APPROACH statement from old web - NEW */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 grid md:grid-cols-2 gap-10">
        <div><p className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">03 — Approach</p><h2 className="mt-2 text-[32px] font-semibold">Good design makes room for better ideas.</h2></div>
        <div><p className="text-[16px] text-[#515154]">My process starts with curiosity, honest conversations, and an eye for the small details. The final work should look considered and feel effortless to use.</p><a href="#contact" className="mt-6 inline-block bg-black text-white rounded-full px-6 py-3 text-sm">Let’s work together ↗</a></div>
      </section>

      {/* CONTACT - merged old contact.html data */}
      <section id="contact" className="max-w-[1280px] mx-auto px-6 md:px-10 py-20">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">{contactInfo.eyebrow}</p>
            <h2 className="text-[36px] md:text-[56px] font-semibold tracking-tight mt-3">{contactInfo.title}</h2>
            <p className="mt-4 text-[#515154]">{contactInfo.lede}</p>
            <div className="mt-6 flex gap-2 text-[11px] text-[#86868B]">{contactInfo.meta.map((m,i)=><span key={i} className="bg-[#F5F5F7] rounded-full px-3 py-1">{m}</span>)}</div>
            <div className="mt-8 space-y-3 text-[14px]">
              <a href={contactInfo.links.email} className="flex justify-between border-b py-2"><span className="text-[#86868B]">Email</span><span>{contactInfo.email} ↗</span></a>
              <a href={contactInfo.links.instagram} target="_blank" className="flex justify-between border-b py-2"><span className="text-[#86868B]">Instagram</span><span>{contactInfo.instagram} ↗</span></a>
              <a href={contactInfo.links.tiktok} target="_blank" className="flex justify-between border-b py-2"><span className="text-[#86868B]">TikTok</span><span>{contactInfo.tiktok} ↗</span></a>
              <a href={contactInfo.links.youtube} target="_blank" className="flex justify-between border-b py-2"><span className="text-[#86868B]">YouTube</span><span>{contactInfo.youtube} ↗</span></a>
            </div>
          </div>
          <div className="rounded-[24px] bg-white border p-6">
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-1"><label className="text-[12px]">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="rounded-full border px-4 py-3 text-sm" required/></div>
              <div className="grid gap-1"><label className="text-[12px]">Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="rounded-full border px-4 py-3 text-sm" required/></div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})} className="rounded-full border px-4 py-3 text-sm"><option>Branding</option><option>Product Video</option><option>Campaign design</option><option>Other</option></select>
                <select value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} className="rounded-full border px-4 py-3 text-sm"><option>&lt;$300</option><option>$300-$1000</option><option>$1000+</option></select>
              </div>
              <div className="grid gap-1"><label className="text-[12px]">Tell me about your project</label><textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Share the goal, the timeline, and anything you already have." className="rounded-[16px] border px-4 py-3 text-sm h-28" required/></div>
              <button className="bg-black text-white rounded-full py-3 text-sm">{sent?'Terkirim ✓':'Send message ↗'}</button>
              <div className="text-center text-[11px] text-[#86868B]">Replies in 2–3 days • Response &lt;24h async • taufiqsholikhin@gmail.com • (+62) 812 1615 2280</div>
            </form>
          </div>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-[11px] text-[#86868B] px-6">© 2026 Khincc Studio • Taufiq Sholikhin - Remote Designer & Video Editor | Khinccofficial • Indonesia • Made with intention.</footer>
    </main>
  )
}