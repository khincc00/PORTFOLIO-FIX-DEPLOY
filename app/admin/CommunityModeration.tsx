'use client'
/**
 * app/admin/CommunityModeration.tsx → menu KOMUNITAS di admin.
 * Menampilkan laporan dari anggota. Admin bisa membuka kiriman, menghapus konten, atau menutup laporan.
 * Class seperti "flex gap-2 text-xs" adalah class Tailwind (lihat tailwind.config.js).
 */

import { useEffect, useState } from 'react'
import { adminFetch as fetch } from '@/lib/admin-fetch'

interface Report {
  id: number
  target_type: 'post' | 'comment'
  target_id: number
  reason: string
  created_at: string
  reporter: string
  author: string
  post_id: number | null
  excerpt: string | null // null = kontennya sudah dihapus
}

export default function CommunityModeration() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/community')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Gagal memuat laporan')
        setReports(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Tutup laporan tanpa menghapus kontennya
  const dismiss = async (r: Report) => {
    const res = await fetch(`/api/admin/community?id=${r.id}`, { method: 'DELETE' })
    if (!res.ok) return alert((await res.json()).error || 'Gagal menutup laporan')
    setReports((list) => list.filter((x) => x.id !== r.id))
  }

  // Hapus kontennya (laporan ikut hilang karena database membersihkannya)
  const removeContent = async (r: Report) => {
    if (!confirm(`Hapus ${r.target_type === 'post' ? 'kiriman' : 'komentar'} dari @${r.author} secara permanen?`)) return
    const res = await fetch(`/api/community/${r.target_type === 'post' ? 'posts' : 'comments'}?id=${r.target_id}`, { method: 'DELETE' })
    if (!res.ok) return alert((await res.json()).error || 'Gagal menghapus')
    setReports((list) => list.filter((x) => !(x.target_type === r.target_type && x.target_id === r.target_id)))
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Komunitas</h2>
        <p className="text-xs text-[#86868B] mt-1">
          Laporan dari anggota. Sebagai admin kamu juga bisa menghapus kiriman atau komentar apa pun langsung dari halaman{' '}
          <a href="/komunitas" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">/komunitas</a>.
        </p>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat laporan...</div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">Tidak ada laporan.</div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="p-4 flex gap-4 items-start hover:bg-neutral-50">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded font-medium bg-orange-50 text-orange-700">{r.target_type === 'post' ? 'Kiriman' : 'Komentar'}</span>
                  <span>oleh <strong>@{r.author}</strong></span>
                  <span className="text-[#86868B]">dilaporkan @{r.reporter} · {new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                {r.reason && <p className="text-xs mt-1.5 text-red-700">Alasan: {r.reason}</p>}
                <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{r.excerpt ?? '(konten sudah dihapus)'}</p>
                {r.post_id && r.excerpt && (
                  <a href={`/komunitas/${r.post_id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1.5 inline-block">Buka ↗</a>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                {r.excerpt && <button onClick={() => removeContent(r)} className="text-red-600 hover:underline cursor-pointer">Hapus konten</button>}
                <button onClick={() => dismiss(r)} className="text-[#86868B] hover:underline cursor-pointer">Tutup laporan</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
