'use client'

import { useEffect, useState, FormEvent } from 'react'
import { portfolioSeed } from '@/lib/portfolio-data'

interface WorkItem {
  id?: number
  title: string
  likes?: number
  reel_id: string
  category: string
  description: string
}

export default function Page() {
  const [works, setWorks] = useState<WorkItem[]>(portfolioSeed)
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    project_type: 'Branding',
    budget: '<$500',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Derive categories dynamically from current works list
  const categories = ['All', ...Array.from(new Set(works.map((p) => p.category).filter(Boolean)))]
  const filteredWorks = filter === 'All' ? works : works.filter((w) => w.category === filter)

  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setWorks(d)
        }
      })
      .catch(() => {
        // Fallback to local seed on error
      })
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setForm({
          name: '',
          email: '',
          project_type: 'Branding',
          budget: '<$500',
          message: '',
        })
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Gagal mengirim pesan. Silakan coba lagi.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Terjadi kesalahan jaringan. Silakan coba lagi.')
    }
  }

  return (
    <main className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.06] px-6 md:px-10 h-[56px] flex items-center justify-between">
        <a href="#" className="font-semibold tracking-tight hover:opacity-80 transition">
          KHINCC®
        </a>
        <div className="hidden md:flex gap-6 text-[13px] text-[#86868B]">
          <a href="#about" className="hover:text-black transition">
            About
          </a>
          <a href="#services" className="hover:text-black transition">
            Services
          </a>
          <a href="#works" className="hover:text-black transition">
            Works
          </a>
          <a href="#contact" className="hover:text-black transition">
            Contact
          </a>
        </div>
        <a
          href="#contact"
          className="bg-black text-white hover:bg-neutral-800 transition rounded-full px-4 py-1.5 text-[13px]"
        >
          Hire Me
        </a>
      </nav>

      {/* Hero Section */}
      <section id="about" className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 pb-16 text-center">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">
          SANGATTA • WITA UTC+8 • FULLY REMOTE • ASYNC OK US/EU
        </div>
        <h1 className="mt-6 text-[48px] md:text-[84px] leading-[0.9] tracking-[-0.04em]">
          <span className="font-light">Remote designer &</span>
          <br />
          <span className="font-semibold">video specialist.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-7 text-[#515154]">
          Multimedia Creator @khinccofficial — 6+ tahun bikin brand identity, marketing collateral,
          dan short-form product video untuk pemerintah, publishing, dan 20+ klien global. Fokus
          review gear streaming murah.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-[12px]">
          <span className="bg-[#F5F5F7] rounded-full px-3 py-1">50+ Assets TNI AL</span>
          <span className="bg-[#F5F5F7] rounded-full px-3 py-1">32+ Projects</span>
          <span className="bg-[#F5F5F7] rounded-full px-3 py-1">1,971 Followers</span>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#works"
            className="bg-black text-white hover:bg-neutral-800 transition rounded-full px-6 py-3 text-sm"
          >
            View {works.length} works
          </a>
          <a
            href="mailto:taufiqsholikhin@gmail.com"
            className="bg-[#F5F5F7] hover:bg-neutral-200 transition rounded-full px-6 py-3 text-sm text-[#1D1D1F]"
          >
            taufiqsholikhin@gmail.com
          </a>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 border-t border-black/[0.06]">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase text-center md:text-left">
          02 / CORE CAPABILITIES
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Service Card 1: Video */}
          <div className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition duration-200">
            <div className="relative h-40 overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/thumbnails/service-video.jpg"
                alt="Short-Form Video & Reels service"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  if (t.parentElement) t.parentElement.style.background = 'linear-gradient(135deg,#1a1a2e,#16213e)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
                <span className="text-white text-xs font-semibold">📹 Short-Form Video</span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-sm font-semibold text-black">Short-Form Video & Reels</div>
              <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
                Product review videos, dynamic unboxing, high-retention hooks crafted for conversion on Instagram Reels & TikTok.
              </p>
              <div className="mt-3 text-xs text-[#86868B]">From <span className="font-semibold text-black">$15 / video</span></div>
            </div>
          </div>

          {/* Service Card 2: Branding */}
          <div className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition duration-200">
            <div className="relative h-40 overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/thumbnails/service-branding.jpg"
                alt="Brand Identity & Collateral service"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  if (t.parentElement) t.parentElement.style.background = 'linear-gradient(135deg,#0f0c29,#302b63)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="text-white text-xs font-semibold">🎨 Brand Identity</span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-sm font-semibold text-black">Brand Identity & Collateral</div>
              <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
                Logo system, visual branding, typography, and packaging design for tech, audio, and institutional clients.
              </p>
              <div className="mt-3 text-xs text-[#86868B]">From <span className="font-semibold text-black">$25 / project</span></div>
            </div>
          </div>

          {/* Service Card 3: Audio */}
          <div className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition duration-200">
            <div className="relative h-40 overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/thumbnails/service-audio.jpg"
                alt="Audio & Streaming Setup service"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  if (t.parentElement) t.parentElement.style.background = 'linear-gradient(135deg,#1a1a1a,#2d2d2d)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="text-white text-xs font-semibold">🎙️ Audio Setup</span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-sm font-semibold text-black">Audio & Streaming Setup</div>
              <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
                Microphone setup consultation, filter tuning, aesthetic lighting, and budget-friendly gear recommendations.
              </p>
              <div className="mt-3 text-xs text-[#86868B]">From <span className="font-semibold text-black">$10 / consult</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Works Section */}
      <section id="works" className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 border-t border-black/[0.06]">
        <div className="text-[11px] tracking-[0.15em] text-[#86868B] uppercase">
          03 / SELECTED WORKS • {works.length} CURATED
        </div>
        <h2 className="mt-3 text-[32px] md:text-[48px] tracking-tight font-semibold">
          Gear reviews that convert.
        </h2>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-4 py-1.5 text-[13px] transition whitespace-nowrap border ${
                filter === c ? 'bg-black text-white border-black' : 'bg-white border-black/10 hover:border-black/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {filteredWorks.map((w, i) => (
            <div
              key={w.reel_id || i}
              className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition duration-200"
            >
              {/* Instagram Reel Thumbnail */}
              <a
                href={`https://www.instagram.com/reel/${w.reel_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative h-44 bg-neutral-100 overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.instagram.com/p/${w.reel_id}/media/?size=m`}
                  alt={w.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const t = e.currentTarget
                    t.style.display = 'none'
                    const fallback = t.parentElement?.querySelector('.reel-fallback') as HTMLElement | null
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div
                  className="reel-fallback absolute inset-0 hidden flex-col items-center justify-center gap-1 bg-gradient-to-br from-neutral-900 to-neutral-700"
                >
                  <span className="text-2xl">🎬</span>
                  <span className="text-white text-[11px] font-medium">{w.category}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5 text-white text-[10px]">
                  ♥ {w.likes ?? 0}
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-[10px]">
                  {w.category}
                </div>
              </a>

              <div className="p-5">
                <div className="flex justify-between items-center text-[11px] text-[#86868B]">
                  <span className="font-mono">#{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-neutral-400">{w.reel_id}</span>
                </div>
                <h3 className="mt-2 font-semibold tracking-tight text-base leading-snug">{w.title}</h3>
                <p className="mt-1 text-[13px] text-[#86868B] line-clamp-2">{w.description}</p>
                <a
                  href={`https://www.instagram.com/reel/${w.reel_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 bg-black text-white hover:bg-neutral-800 transition rounded-full px-4 py-2 text-[12px]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  View Reel
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-[1280px] mx-auto px-6 md:px-10 py-20 border-t border-black/[0.06]">
        <h2 className="text-[36px] md:text-[56px] font-semibold tracking-tight text-center">
          Let’s build remote-friendly.
        </h2>
        <div className="mx-auto mt-10 max-w-2xl rounded-[24px] bg-white border border-black/[0.08] shadow-sm p-6 md:p-8">
          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label htmlFor="name" className="sr-only">Nama</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama Lengkap"
                className="w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none focus:border-black transition"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Alamat Email"
                className="w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none focus:border-black transition"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="project_type" className="sr-only">Tipe Project</label>
                <select
                  id="project_type"
                  value={form.project_type}
                  onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                  className="w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none focus:border-black transition bg-white"
                >
                  <option value="Branding">Branding</option>
                  <option value="Product Video">Product Video</option>
                  <option value="Audio Setup">Audio Setup</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="budget" className="sr-only">Budget</label>
                <select
                  id="budget"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none focus:border-black transition bg-white"
                >
                  <option value="<$500">&lt;$500</option>
                  <option value="$500-$2,000">$500 – $2,000</option>
                  <option value="$2,000+">$2,000+</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="message" className="sr-only">Pesan</label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Deskripsikan kebutuhan project Anda..."
                className="w-full rounded-[16px] border border-black/10 px-4 py-3 text-sm h-28 outline-none focus:border-black transition resize-none"
                required
              />
            </div>

            {status === 'error' && (
              <div className="text-red-600 text-xs text-center">{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-full py-3 text-sm font-medium transition cursor-pointer"
            >
              {status === 'loading'
                ? 'Mengirim...'
                : status === 'success'
                ? 'Terkirim ✓'
                : 'Send Message'}
            </button>
            <div className="text-center text-[11px] text-[#86868B] pt-2">
              Response &lt;24h async • taufiqsholikhin@gmail.com • (+62) 812 1615 2280 • lynk.id/khincc
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-10 text-center text-[11px] text-[#86868B] px-6">
        <div>
          Taufiq Sholikhin - Remote Designer & Video Editor | Khinccofficial • 50+ assets TNI AL • 32+ clients • © 2026 Khincc
        </div>
        <div className="mt-2 flex justify-center gap-4">
          <a
            href="https://github.com/khincc00"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition underline"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  )
}
