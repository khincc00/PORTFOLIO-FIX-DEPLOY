'use client'

import { useState } from 'react'
import { formatNewsDate, type NewsPost } from '@/lib/news'

interface Props {
  posts: NewsPost[]
  loading: boolean
  error: string | null
  onNew: () => void
  onEdit: (post: NewsPost) => void
  onDeleted: (id: number) => void
}

type Filter = 'all' | 'published' | 'draft'

const statusBadge = (post: NewsPost) => {
  if (post.status === 'draft') return { label: 'Draft', cls: 'bg-neutral-100 text-neutral-600' }
  if (post.published_at && new Date(post.published_at) > new Date()) return { label: 'Terjadwal', cls: 'bg-amber-50 text-amber-700' }
  return { label: 'Terbit', cls: 'bg-emerald-50 text-emerald-700' }
}

export default function NewsList({ posts, loading, error, onNew, onEdit, onDeleted }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  }

  const visible = posts
    .filter((p) => filter === 'all' || p.status === filter)
    .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))

  const remove = async (post: NewsPost) => {
    if (!confirm(`Hapus berita "${post.title}" secara permanen?`)) return
    setDeletingId(post.id)
    try {
      const res = await fetch(`/api/admin/news/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menghapus')
      onDeleted(post.id)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Berita</h2>
        <button onClick={onNew} className="bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-800 transition cursor-pointer">
          + Tambah Baru
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 text-xs">
          {(['all', 'published', 'draft'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full cursor-pointer ${filter === f ? 'bg-black text-white' : 'text-[#86868B] hover:text-black'}`}
            >
              {f === 'all' ? 'Semua' : f === 'published' ? 'Terbit' : 'Draft'} ({counts[f]})
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari berita..."
          className="rounded-full border border-black/15 px-4 py-2 text-xs outline-none focus:border-black w-full sm:w-60"
        />
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat berita...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">
            {posts.length === 0 ? 'Belum ada berita. Klik "Tambah Baru" untuk menulis berita pertama.' : 'Tidak ada berita yang cocok.'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F5F7] text-xs text-[#86868B] uppercase border-b">
              <tr>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {visible.map((post) => {
                const badge = statusBadge(post)
                return (
                  <tr key={post.id} className="group hover:bg-neutral-50 align-top">
                    <td className="px-4 py-3 min-w-[260px]">
                      <div className="flex gap-3">
                        {post.cover_image ? (
                          <img src={post.cover_image} alt="" className="w-14 h-10 object-cover rounded border border-black/10 shrink-0" />
                        ) : (
                          <div className="w-14 h-10 rounded bg-neutral-100 shrink-0" />
                        )}
                        <div>
                          <button onClick={() => onEdit(post)} className="font-medium text-left hover:text-blue-600 cursor-pointer">
                            {post.title}
                          </button>
                          <div className="flex gap-2 text-[11px] mt-1 sm:opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => onEdit(post)} className="text-blue-600 hover:underline cursor-pointer">Edit</button>
                            {badge.label === 'Terbit' && (
                              <a href={`/berita/${post.slug}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat</a>
                            )}
                            <button onClick={() => remove(post)} disabled={deletingId === post.id} className="text-red-600 hover:underline cursor-pointer disabled:opacity-50">
                              {deletingId === post.id ? 'Menghapus...' : 'Hapus'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-[#F5F5F7] px-2 py-0.5 rounded text-xs">{post.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#86868B] whitespace-nowrap">
                      {post.status === 'published' ? formatNewsDate(post.published_at) : `Diubah ${formatNewsDate(post.updated_at)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
