'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
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
    budget: '<500k',
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
          budget: '<500k',
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
          <Link href="/admin" className="hover:text-black transition text-neutral-400">
            Admin
          </Link>
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
          <div className="p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-sm font-semibold text-black">Short-Form Video & Reels</div>
            <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
              Video review produk, unboxing dinamis, hook retention tinggi yang dirancang untuk konversi di Instagram Reels & TikTok.
            </p>
          </div>
          <div className="p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-sm font-semibold text-black">Brand Identity & Collateral</div>
            <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
              Logo system, visual branding, typography, dan packaging design untuk produk tech, audio, dan klien institusi.
            </p>
          </div>
          <div className="p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-sm font-semibold text-black">Audio & Streaming Setup</div>
            <p className="mt-2 text-[13px] text-[#86868B] leading-relaxed">
              Konsultasi setup microphone, filter tuning, lighting aesthetic, dan gear recommendation budget-friendly.
            </p>
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
              className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition duration-200"
            >
              <div className="flex justify-between items-center text-[11px] text-[#86868B]">
                <span>0{String(i + 1).padStart(2, '0')}</span>
                <span>♥ {w.likes ?? 0}</span>
                <span className="bg-[#F5F5F7] rounded-full px-2 py-0.5">{w.category}</span>
              </div>
              <div className="mt-4 h-28 rounded-[16px] bg-gradient-to-br from-[#F5F5F7] to-white border border-black/[0.04] flex flex-col items-center justify-center text-[#86868B] text-xs gap-1">
                <span className="font-medium text-neutral-700">{w.category}</span>
                <span className="text-[11px] text-neutral-400 font-mono">Reel: {w.reel_id}</span>
              </div>
              <h3 className="mt-4 font-semibold tracking-tight text-base">{w.title}</h3>
              <p className="mt-1 text-[13px] text-[#86868B] line-clamp-2">{w.description}</p>
              <a
                href={`https://www.instagram.com/reel/${w.reel_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-black text-white hover:bg-neutral-800 transition rounded-full px-4 py-2 text-[12px]"
              >
                View Reel ↗
              </a>
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
                  <option value="<500k">&lt;500k</option>
                  <option value="500k-2jt">500k - 2jt</option>
                  <option value="2jt+">2jt+</option>
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
              Response &lt;24h async • taufiqsholikhin@gmail.com • 0822-5131-4149 • lynk.id/khincc
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
          <Link href="/admin" className="hover:text-black transition underline">
            Dashboard Admin
          </Link>
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
