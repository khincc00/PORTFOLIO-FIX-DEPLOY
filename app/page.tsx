'use client'
import { useEffect, useState } from 'react'
import { portfolioSeed } from '@/lib/portfolio-data'

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
        <div className="font-semibold tracking-tight">KHINCC®</div>
        <div className="hidden md:flex gap-6 text-[13px] text-[#86868B]"><span>About</span><span>Services</span><span>Works</span><span>Experience</span></div>
        <a href="#contact" className="bg-black text-white rounded-full px-4 py-1.5 text-[13px]">Hire Me</a>
      </nav>

      <section className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 pb-16 text-center">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">SANGATTA • WITA UTC+8 • FULLY REMOTE • ASYNC OK US/EU</div>
        <h1 className="mt-6 text-[48px] md:text-[84px] leading-[0.9] tracking-[-0.04em]"><span className="font-light">Remote designer &</span><br/><span className="font-semibold">video specialist.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-7 text-[#515154]">Multimedia Creator @khinccofficial — 6+ tahun bikin brand identity, marketing collateral, dan short-form product video untuk pemerintah, publishing, dan 20+ klien global. Fokus review gear streaming murah.</p>
        <div className="mt-6 flex justify-center gap-2 text-[12px]"><span className="bg-[#F5F5F7] rounded-full px-3 py-1">50+ Assets TNI AL</span><span className="bg-[#F5F5F7] rounded-full px-3 py-1">32+ Projects</span><span className="bg-[#F5F5F7] rounded-full px-3 py-1">1,971 Followers</span></div>
        <div className="mt-8 flex justify-center gap-3"><a href="#works" className="bg-black text-white rounded-full px-6 py-3 text-sm">View 14 works</a><a href="mailto:taufiqsholikhin@gmail.com" className="bg-[#F5F5F7] rounded-full px-6 py-3 text-sm">taufiqsholikhin@gmail.com</a></div>
      </section>

      <section id="works" className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">03 / SELECTED WORKS • 14 CURATED</div>
        <h2 className="mt-3 text-[32px] md:text-[48px] tracking-tight font-semibold">Gear reviews that convert.</h2>
        <div className="mt-6 flex gap-2 overflow-auto pb-2">{cats.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full px-4 py-1.5 text-[13px] border ${filter===c?'bg-black text-white border-black':'bg-white border-black/10'}`}>{c}</button>)}</div>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {filtered.map((w,i)=>(
            <div key={i} className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition">
              <div className="flex justify-between text-[11px] text-[#86868B]"><span>0{String(i+1).padStart(1,'0')}</span><span>♥ {w.likes}</span><span className="bg-[#F5F5F7] rounded-full px-2 py-0.5">{w.category}</span></div>
              <div className="mt-4 h-24 rounded-[16px] bg-gradient-to-br from-[#F5F5F7] to-white border border-black/[0.04] flex items-center justify-center text-[#86868B] text-xs">{w.category} Preview</div>
              <h3 className="mt-4 font-semibold tracking-tight">{w.title}</h3>
              <p className="mt-1 text-[13px] text-[#86868B]">{w.description}</p>
              <a href={`https://www.instagram.com/reel/${w.reel_id}/`} target="_blank" className="mt-4 inline-block bg-black text-white rounded-full px-4 py-2 text-[12px]">View Reel</a>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="max-w-[1280px] mx-auto px-6 md:px-10 py-20">
        <h2 className="text-[36px] md:text-[56px] font-semibold tracking-tight text-center">Let’s build remote-friendly.</h2>
        <div className="mx-auto mt-10 max-w-2xl rounded-[24px] bg-white border p-6">
          <form onSubmit={submit} className="grid gap-4">
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama" className="rounded-full border px-4 py-3 text-sm" required/>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="rounded-full border px-4 py-3 text-sm" required/>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.project_type} onChange={e=>setForm({...form,project_type:e.target.value})} className="rounded-full border px-4 py-3 text-sm"><option>Branding</option><option>Product Video</option><option>Other</option></select>
              <select value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} className="rounded-full border px-4 py-3 text-sm"><option>&lt;500k</option><option>500k-2jt</option><option>2jt+</option></select>
            </div>
            <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Message" className="rounded-[16px] border px-4 py-3 text-sm h-24" required/>
            <button className="bg-black text-white rounded-full py-3 text-sm">{sent?'Terkirim ✓':'Send Message'}</button>
            <div className="text-center text-[11px] text-[#86868B]">Response &lt;24h async • taufiqsholikhin@gmail.com • 0822-5131-4149 • lynk.id/khincc</div>
          </form>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-[11px] text-[#86868B] px-6">Taufiq Sholikhin - Remote Designer & Video Editor | Khinccofficial • 50+ assets TNI AL • 32+ clients • khincc00.github.io/META-PROJECT-AI-BASE • © 2026 Khincc</footer>
    </main>
  )
}
