'use client'
/**
 * app/admin/page.tsx → HALAMAN ADMIN (https://khincreator.com/admin)
 *
 * Alur halaman:
 * 1. Saat dibuka, cek apakah cookie sesi admin masih berlaku (GET /api/admin/auth).
 * 2. Belum login → tampilkan layar kunci (form username & password).
 * 3. Sudah login → tampilkan panel dengan menu:
 *      Dashboard  → pesan kontak & tabel reel lama
 *      Portfolio  → kelola karya Design/Video/Web (app/admin/PortfolioManager.tsx)
 *      Berita     → daftar berita (NewsList.tsx) dan form tulis/edit (NewsEditor.tsx)
 *      Komentar   → moderasi komentar (CommentsList.tsx)
 *      Komunitas  → laporan & moderasi komunitas (CommunityModeration.tsx)
 * Variabel `view` menentukan menu mana yang sedang tampil.
 */

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import type { NewsPost } from '@/lib/news'
import NewsList from './NewsList'
import NewsEditor from './NewsEditor'
import CommentsList from './CommentsList'
import CommunityModeration from './CommunityModeration'
import PortfolioManager from './PortfolioManager'

// Bentuk data reel dari tabel LAMA `portfolio` (hanya untuk tabel di Dashboard)
interface PortfolioItem {
  id?: number
  title: string
  likes?: number
  reel_id: string
  category: string
  description: string
  is_published?: boolean
  created_at?: string
}

// Bentuk satu pesan dari form kontak
interface ContactItem {
  id: number
  name: string
  email: string
  project_type: string
  budget: string
  message: string
  status?: string
  created_at: string
}

// Menu yang bisa dibuka. 'editor' = form tulis/edit berita
type View = 'dashboard' | 'portfolio' | 'news' | 'editor' | 'comments' | 'community'

export default function AdminPage() {
  // --- Status login ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('dashboard') // menu yang sedang dibuka

  // --- Data Dashboard ---
  const [portfolioList, setPortfolioList] = useState<PortfolioItem[]>([])
  const [contactList, setContactList] = useState<ContactItem[]>([])
  const [dbError, setDbError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isAdminDbConfigured, setIsAdminDbConfigured] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  // --- Data Berita ---
  const [newsList, setNewsList] = useState<NewsPost[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null)
  // editorKey diganti setiap membuka editor supaya form dimulai dari awal (React membuat ulang komponennya)
  const [editorKey, setEditorKey] = useState(0)

  // Kalau server menjawab 401 (sesi habis), kembali ke layar login
  const handleSessionExpired = (message?: string) => {
    setIsAuthenticated(false)
    setAuthError(message || 'Sesi telah kedaluwarsa')
  }

  // Ambil data Dashboard: pesan kontak, reel lama, dan status koneksi Supabase
  const fetchDashboardData = async () => {
    setDataLoading(true)
    try {
      const res = await fetch('/api/admin/data')
      const data = await res.json()
      if (res.ok) {
        setPortfolioList(data.portfolioList || [])
        setContactList(data.contactList || [])
        setDbError(data.dbError || null)
        setIsConfigured(data.isSupabaseConfigured || false)
        setIsAdminDbConfigured(data.isAdminDbConfigured || false)
      } else if (res.status === 401) {
        handleSessionExpired(data.error)
      }
    } catch {
      setDbError('Gagal memuat data dari server.')
    } finally {
      setDataLoading(false)
    }
  }

  // Ambil semua berita (draft + terbit)
  const fetchNews = async () => {
    setNewsLoading(true)
    setNewsError(null)
    try {
      const res = await fetch('/api/admin/news')
      const data = await res.json()
      if (res.ok) setNewsList(data)
      else if (res.status === 401) handleSessionExpired(data.error)
      else setNewsError(data.error || 'Gagal memuat berita')
    } catch {
      setNewsError('Gagal memuat berita dari server.')
    } finally {
      setNewsLoading(false)
    }
  }

  // Muat data Dashboard dan Berita bersamaan
  const loadAll = () => Promise.all([fetchDashboardData(), fetchNews()])

  // Saat halaman dibuka: cek apakah masih login dari kunjungan sebelumnya (cookie sesi)
  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setIsAuthenticated(true)
          loadAll()
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kirim username & password ke server untuk login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsAuthenticated(true)
        setPasswordInput('')
        await loadAll()
      } else {
        setAuthError(data.error || 'Username atau password salah.')
      }
    } catch {
      setAuthError('Gagal memverifikasi akun.')
    } finally {
      setLoading(false)
    }
  }

  // Logout: hapus cookie sesi di server, lalu kembali ke layar login
  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {})
    setIsAuthenticated(false)
    setPasswordInput('')
    setView('dashboard')
  }

  // Buka form berita. post = null → berita baru; berisi berita → mode edit
  const openEditor = (post: NewsPost | null) => {
    setEditingPost(post)
    setEditorKey((k) => k + 1)
    setView('editor')
  }

  // Setelah berita disimpan: pindahkan ke paling atas daftar (ganti versi lamanya)
  const handleNewsSaved = (post: NewsPost) => {
    setEditingPost(post)
    setNewsList((list) => [post, ...list.filter((p) => p.id !== post.id)])
  }

  // Selama masih mengecek sesi, tampilkan "Memuat..."
  if (checkingSession) {
    return <main className="min-h-screen bg-[#FBFBFD] flex items-center justify-center text-sm text-[#86868B]">Memuat...</main>
  }

  // ===== LAYAR KUNCI (belum login) =====
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-6 text-[#1D1D1F]">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.08] shadow-lg p-8 text-center">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🔒
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Admin Authentication</h1>
          <p className="text-xs text-[#86868B] mt-1">
            Halaman ini diproteksi. Masuk dengan akun admin untuk melanjutkan.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="w-full rounded-full border border-black/15 px-4 py-3 text-sm text-center outline-none focus:border-black transition"
              required
              autoFocus
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-full border border-black/15 px-4 py-3 text-sm text-center tracking-widest outline-none focus:border-black transition"
              required
            />

            {authError && (
              <div className="text-xs text-red-600 bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-full py-3 text-sm font-medium transition cursor-pointer"
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 border-t border-black/[0.06] pt-4">
            <Link href="/" className="text-xs text-[#86868B] hover:text-black transition">
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ===== PANEL ADMIN (sudah login) =====
  return (
    <main className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header: judul, tombol ke website, dan logout */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/[0.08] pb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#86868B]">Dashboard Management</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/studio" className="inline-flex items-center gap-2 bg-[#e65c3a] text-white px-4 py-2 rounded-full text-xs font-medium">
              Studio iPhone
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-neutral-100 text-[#1D1D1F] px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-200 transition"
            >
              ← Ke Website
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-800 transition cursor-pointer"
            >
              Keluar (Logout)
            </button>
          </div>
        </div>

        {/* Menu: setiap tombol mengganti nilai `view` */}
        <div className="flex flex-wrap gap-1 text-sm -mt-4">
          {([
            ['dashboard', 'Dashboard'],
            ['portfolio', 'Portfolio'],
            ['news', `Berita (${newsList.length})`],
            ['comments', 'Komentar'],
            ['community', 'Komunitas'],
          ] as [View, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-2 rounded-full cursor-pointer transition ${
                view === key || (key === 'news' && view === 'editor') ? 'bg-black text-white' : 'text-[#86868B] hover:text-black hover:bg-neutral-100'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => openEditor(null)}
            className="px-4 py-2 rounded-full cursor-pointer text-[#86868B] hover:text-black hover:bg-neutral-100 transition"
          >
            + Tulis Berita
          </button>
        </div>

        {/* Peringatan kalau kunci database admin belum diisi (biasanya hanya di komputer lokal) */}
        {isConfigured && !isAdminDbConfigured && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
            <strong>SUPABASE_SERVICE_ROLE_KEY belum diisi.</strong> Berita tidak bisa disimpan dan pesan kontak tidak bisa dibaca
            sampai key ini ditambahkan di <code>.env.local</code> dan Environment Variables Vercel
            (Supabase Dashboard → Project Settings → API → service_role).
          </div>
        )}

        {/* Isi halaman sesuai menu yang dipilih */}
        {view === 'news' && (
          <NewsList
            posts={newsList}
            loading={newsLoading}
            error={newsError}
            onNew={() => openEditor(null)}
            onEdit={openEditor}
            onDeleted={(id) => setNewsList((list) => list.filter((p) => p.id !== id))}
          />
        )}

        {view === 'comments' && <CommentsList />}
        {view === 'community' && <CommunityModeration />}

        {view === 'portfolio' && <PortfolioManager />}

        {view === 'editor' && (
          <NewsEditor
            key={editorKey}
            post={editingPost}
            onSaved={handleNewsSaved}
            onCancel={() => setView('news')}
          />
        )}

        {view === 'dashboard' && (<>
        {/* Status koneksi Supabase */}
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-4 ${
            isConfigured && !dbError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConfigured && !dbError ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {isConfigured && !dbError
                ? 'Supabase Terhubung: Menampilkan data langsung dari database Supabase.'
                : 'Supabase Belum Dikonfigurasi di Vercel: Menampilkan fallback seed data.'}
            </span>
          </div>
          <span className="text-xs font-mono bg-white/70 px-2 py-1 rounded">
            {isConfigured ? 'CONNECTED' : 'LOCAL FALLBACK'}
          </span>
        </div>

        {dbError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono">
            Error Database: {dbError}
          </div>
        )}

        {/* Kotak angka ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
            <div className="text-xs text-[#86868B] uppercase">Total Portfolio</div>
            <div className="text-3xl font-bold mt-2">{portfolioList.length}</div>
            <div className="text-xs text-[#86868B] mt-1">
              {isConfigured ? 'Tersimpan di Supabase' : 'Seed Data Lokal'}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
            <div className="text-xs text-[#86868B] uppercase">Pesan Masuk (Contacts)</div>
            <div className="text-3xl font-bold mt-2">{contactList.length}</div>
            <div className="text-xs text-[#86868B] mt-1">Form kontak pengunjung</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
            <div className="text-xs text-[#86868B] uppercase">Status Integrasi</div>
            <div className="text-xl font-bold mt-2 truncate">
              {isConfigured ? 'Supabase Active' : 'Setup Required'}
            </div>
            <div className="text-xs text-[#86868B] mt-1">Vercel & Supabase Sync</div>
          </div>
        </div>

        {/* Tabel pesan dari form kontak */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.06] flex justify-between items-center">
            <h2 className="font-semibold text-lg">Pesan Masuk (Contacts)</h2>
            <span className="text-xs text-[#86868B]">{contactList.length} pesan</span>
          </div>
          <div className="overflow-x-auto">
            {dataLoading ? (
              <div className="p-8 text-center text-sm text-[#86868B]">Memuat data...</div>
            ) : contactList.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#86868B]">
                Belum ada pesan kontak masuk dari form website.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F5F7] text-xs text-[#86868B] uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Pesan</th>
                    <th className="px-4 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {contactList.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#F5F5F7] px-2 py-0.5 rounded text-xs">
                          {c.project_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{c.budget}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-neutral-700">
                        {c.message}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#86868B]">
                        {new Date(c.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tabel reel dari tabel LAMA `portfolio` (sudah tidak dipakai beranda; kelola karya di menu Portfolio) */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.06] flex justify-between items-center">
            <h2 className="font-semibold text-lg">Daftar Karya (Portfolio Items)</h2>
            <span className="text-xs text-[#86868B]">{portfolioList.length} items</span>
          </div>
          <div className="overflow-x-auto">
            {dataLoading ? (
              <div className="p-8 text-center text-sm text-[#86868B]">Memuat data...</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F5F7] text-xs text-[#86868B] uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Likes</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3">Reel ID</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {portfolioList.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#F5F5F7] px-2 py-0.5 rounded text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">♥ {item.likes || 0}</td>
                      <td className="px-4 py-3 text-xs text-[#86868B] max-w-sm truncate">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#86868B]">{item.reel_id}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://www.instagram.com/reel/${item.reel_id}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Lihat Reel ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>)}
      </div>
    </main>
  )
}
