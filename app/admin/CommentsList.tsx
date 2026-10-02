'use client'
/**
 * app/admin/CommentsList.tsx → menu KOMENTAR di admin.
 * Menampilkan 200 komentar terbaru dari semua berita, bisa dicari dan dihapus.
 * Class seperti "flex gap-2 text-xs" adalah class Tailwind (lihat tailwind.config.js).
 */

import { useEffect, useState } from 'react'
import { adminFetch as fetch } from '@/lib/admin-fetch'

// Bentuk data komentar dari /api/admin/comments (termasuk judul & slug beritanya)
interface AdminComment {
  id: number
  author_name: string
  author_type: 'guest' | 'member' | 'admin'
  body: string
  created_at: string
  news: { title: string; slug: string } | null
}

// Label & warna lencana untuk tiap jenis penulis
const typeLabel = { guest: 'Tamu', member: 'Member', admin: 'Penulis' }
const typeClass = { guest: 'bg-neutral-100 text-neutral-600', member: 'bg-emerald-50 text-emerald-700', admin: 'bg-orange-50 text-orange-700' }

// onCount = fungsi dari halaman admin untuk memperbarui angka jumlah komentar di menu samping
export default function CommentsList({ onCount }: { onCount?: (n: number) => void }) {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Ambil daftar komentar sekali saat menu dibuka
  useEffect(() => {
    fetch('/api/admin/comments')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Gagal memuat komentar')
        setComments(d)
        onCount?.(d.length)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hapus satu komentar setelah konfirmasi
  const remove = async (c: AdminComment) => {
    if (!confirm(`Hapus komentar dari "${c.author_name}"?`)) return
    const res = await fetch(`/api/admin/comments/${c.id}`, { method: 'DELETE' })
    if (!res.ok) return alert((await res.json()).error || 'Gagal menghapus')
    const next = comments.filter((x) => x.id !== c.id)
    setComments(next)
    onCount?.(next.length)
  }

  // Pencarian: cocokkan nama, isi komentar, atau judul berita (huruf besar/kecil diabaikan)
  const q = query.toLowerCase()
  const visible = comments.filter(
    (c) => !q || c.author_name.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.news?.title.toLowerCase().includes(q)
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Komentar</h2>
          <p className="text-xs text-[#86868B] mt-1">200 komentar terbaru dari semua berita. Untuk membalas, buka beritanya — saat login admin, komentarmu tampil sebagai Penulis.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, isi, atau judul..."
          className="rounded-full border border-black/15 px-4 py-2 text-xs outline-none focus:border-black w-full sm:w-64"
        />
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat komentar...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">{comments.length ? 'Tidak ada komentar yang cocok.' : 'Belum ada komentar.'}</div>
        ) : (
          visible.map((c) => (
            <div key={c.id} className="p-4 flex gap-4 items-start hover:bg-neutral-50">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <strong className="text-sm">{c.author_name}</strong>
                  <span className={`px-2 py-0.5 rounded font-medium ${typeClass[c.author_type]}`}>{typeLabel[c.author_type]}</span>
                  <span className="text-[#86868B]">{new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{c.body}</p>
                {c.news && (
                  <a href={`/berita/${c.news.slug}#komentar`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1.5 inline-block">
                    di: {c.news.title} ↗
                  </a>
                )}
              </div>
              <button onClick={() => remove(c)} className="text-xs text-red-600 hover:underline cursor-pointer shrink-0">Hapus</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
