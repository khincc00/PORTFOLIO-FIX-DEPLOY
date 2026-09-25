import Link from 'next/link'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { portfolioSeed } from '@/lib/portfolio-data'

export const dynamic = 'force-dynamic'

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

export default async function AdminPage() {
  let portfolioList: PortfolioItem[] = portfolioSeed
  let contactList: ContactItem[] = []
  let dbError: string | null = null

  if (isSupabaseConfigured) {
    try {
      const [portfolioRes, contactsRes] = await Promise.all([
        supabase.from('portfolio').select('*').order('id', { ascending: true }),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      ])

      if (portfolioRes.error) {
        dbError = portfolioRes.error.message
      } else if (portfolioRes.data && portfolioRes.data.length > 0) {
        portfolioList = portfolioRes.data
      }

      if (contactsRes.data) {
        contactList = contactsRes.data
      }
    } catch (e: any) {
      dbError = e.message || 'Failed to fetch from Supabase'
    }
  }

  return (
    <main className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/[0.08] pb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#86868B]">Dashboard Management</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Admin Panel</h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-800 transition"
          >
            ← Kembali ke Website
          </Link>
        </div>

        {/* Status Banner */}
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-4 ${
            isSupabaseConfigured && !dbError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSupabaseConfigured && !dbError ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {isSupabaseConfigured && !dbError
                ? 'Supabase Terhubung: Menampilkan data langsung dari database.'
                : 'Supabase Belum Dikonfigurasi: Menampilkan data seed lokal sebagai fallback.'}
            </span>
          </div>
          <span className="text-xs font-mono bg-white/70 px-2 py-1 rounded">
            {isSupabaseConfigured ? 'CONNECTED' : 'LOCAL FALLBACK'}
          </span>
        </div>

        {dbError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono">
            Error Database: {dbError}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
            <div className="text-xs text-[#86868B] uppercase">Total Portfolio</div>
            <div className="text-3xl font-bold mt-2">{portfolioList.length}</div>
            <div className="text-xs text-[#86868B] mt-1">
              {isSupabaseConfigured ? 'Tersimpan di Supabase' : 'Seed Data Lokal'}
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
              {isSupabaseConfigured ? 'Supabase Active' : 'Setup Required'}
            </div>
            <div className="text-xs text-[#86868B] mt-1">Vercel & Supabase Sync</div>
          </div>
        </div>

        {/* Section: Contacts */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.06] flex justify-between items-center">
            <h2 className="font-semibold text-lg">Pesan Masuk (Contacts)</h2>
            <span className="text-xs text-[#86868B]">{contactList.length} pesan</span>
          </div>
          <div className="overflow-x-auto">
            {contactList.length === 0 ? (
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

        {/* Section: Portfolio */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.06] flex justify-between items-center">
            <h2 className="font-semibold text-lg">Daftar Karya (Portfolio Items)</h2>
            <span className="text-xs text-[#86868B]">{portfolioList.length} items</span>
          </div>
          <div className="overflow-x-auto">
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
          </div>
        </div>
      </div>
    </main>
  )
}