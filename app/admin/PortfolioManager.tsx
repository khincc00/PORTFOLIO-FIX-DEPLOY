'use client'
/**
 * app/admin/PortfolioManager.tsx → menu PORTFOLIO di admin.
 *
 * Dua bagian:
 * 1. PortfolioManager (daftar): tab Design / Video / Web, filter platform video,
 *    tombol ↑ ↓ untuk urutan, ★ Highlight (tampil di beranda), Sembunyikan, Edit, Hapus.
 * 2. PortfolioEditor (form): kolom isian yang menyesuaikan jenis karya.
 * Semua perubahan disimpan lewat /api/admin/portfolio-items.
 */

import { useEffect, useRef, useState } from 'react'
import { adminFetch as fetch } from '@/lib/admin-fetch'
import { uploadImage } from './NewsEditor'
import {
  coverOf,
  emptyItem,
  youtubeId,
  type PortfolioInput,
  type PortfolioItem,
  type PortfolioKind,
  type VideoPlatform,
} from '@/lib/portfolio-items'

// Nama tampilan jenis karya dan platform video
const kindLabel: Record<PortfolioKind, string> = { design: 'Design', video: 'Video', web: 'Web' }
const platformLabel: Record<VideoPlatform, string> = { instagram: 'Instagram Reels', youtube: 'YouTube', tiktok: 'TikTok' }

// Class Tailwind yang dipakai berulang di form
const inputCls = 'w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black bg-white'
const labelCls = 'block text-xs font-semibold mb-1'
const hintCls = 'text-[11px] text-[#86868B] mt-1'

// Isi form: data karya, dengan id kalau sedang mengedit karya yang sudah ada
type Draft = PortfolioInput & { id?: number }

export default function PortfolioManager() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<PortfolioKind>('design') // tab yang aktif
  const [platform, setPlatform] = useState<'all' | VideoPlatform>('all') // filter platform di tab Video
  const [draft, setDraft] = useState<Draft | null>(null) // berisi data = form terbuka; null = daftar
  const [busy, setBusy] = useState(false)

  // Ambil semua karya dari server
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/portfolio-items')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat portfolio')
      setItems(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Karya pada tab aktif (urut posisi), lalu yang terlihat setelah filter platform
  const ofKind = items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position)
  const visible = kind === 'video' && platform !== 'all' ? ofKind.filter((i) => i.platform === platform) : ofKind

  // Tukar posisi dengan tetangga yang terlihat di daftar (bisa sedang difilter),
  // lalu simpan seluruh urutan jenis ini. Tampilan langsung berubah; kalau server gagal, dikembalikan
  const move = async (item: PortfolioItem, dir: -1 | 1) => {
    if (busy) return
    const idx = visible.indexOf(item)
    const neighbour = visible[idx + dir]
    if (!neighbour) return
    const order = [...ofKind]
    const a = order.indexOf(item)
    const b = order.indexOf(neighbour)
    ;[order[a], order[b]] = [order[b], order[a]]
    const positions = new Map(order.map((it, i) => [it.id, i]))
    const previous = items
    setBusy(true)
    setItems(items.map((it) => (positions.has(it.id) ? { ...it, position: positions.get(it.id)! } : it)))
    try {
      const res = await fetch('/api/admin/portfolio-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: order.map((it) => it.id) }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan urutan')
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Koneksi terputus. Urutan dikembalikan.')
    } finally { setBusy(false) }
  }

  // Simpan karya: sudah punya id → PUT (ubah), belum → POST (baru)
  const save = async (payload: Draft) => {
    if (busy) return false
    setBusy(true)
    try {
      const res = await fetch(payload.id ? `/api/admin/portfolio-items/${payload.id}` : '/api/admin/portfolio-items', {
        method: payload.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setItems((list) => [...list.filter((i) => i.id !== data.id), data])
      return true
    } catch (e: any) {
      alert(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  // Tombol cepat di daftar: Sembunyikan/Tampilkan dan ★ Highlight
  const togglePublished = (item: PortfolioItem) => save({ ...item, is_published: !item.is_published })
  const toggleFeatured = (item: PortfolioItem) => save({ ...item, is_featured: !item.is_featured })
  // Jumlah karya ber-highlight yang tampil di daftar saat ini
  const featuredCount = visible.filter((i) => i.is_featured && i.is_published).length

  // Hapus karya permanen setelah konfirmasi
  const remove = async (item: PortfolioItem) => {
    if (busy) return
    if (!confirm(`Hapus "${item.title}" dari portfolio?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/portfolio-items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menghapus')
      setItems((list) => list.filter((i) => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koneksi terputus. Coba lagi.')
    } finally { setBusy(false) }
  }

  // Kalau form terbuka, tampilkan form saja (daftar disembunyikan)
  if (draft) {
    return (
      <PortfolioEditor
        draft={draft}
        busy={busy}
        onCancel={() => setDraft(null)}
        onSave={async (d) => { if (await save(d)) setDraft(null) }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Portfolio</h2>
        <button
          disabled={busy}
          onClick={() => setDraft({ ...emptyItem(kind, ofKind.length), platform: kind === 'video' ? (platform === 'all' ? 'instagram' : platform) : null })}
          className="bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-800 transition cursor-pointer"
        >
          + Tambah {kindLabel[kind]}
        </button>
      </div>

      {/* Tab jenis karya dengan jumlahnya */}
      <div className="flex flex-wrap gap-1 text-sm border-b border-black/[0.08]">
        {(['design', 'video', 'web'] as PortfolioKind[]).map((k) => (
          <button
            key={k}
            onClick={() => { setKind(k); setPlatform('all') }}
            className={`px-4 py-2 -mb-px border-b-2 cursor-pointer ${kind === k ? 'border-black font-semibold' : 'border-transparent text-[#86868B] hover:text-black'}`}
          >
            {kindLabel[k]} <span className="text-xs text-[#86868B]">({items.filter((i) => i.kind === k).length})</span>
          </button>
        ))}
      </div>

      {/* Filter platform, hanya di tab Video */}
      {kind === 'video' && (
        <div className="flex flex-wrap gap-1 text-xs">
          {(['all', 'instagram', 'youtube', 'tiktok'] as const).map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1.5 rounded-full cursor-pointer ${platform === p ? 'bg-black text-white' : 'text-[#86868B] hover:text-black'}`}>
              {p === 'all' ? 'Semua' : platformLabel[p]} ({p === 'all' ? ofKind.length : ofKind.filter((i) => i.platform === p).length})
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-[#86868B]">
        Urutan di sini = urutan di website. Gunakan ↑ ↓ untuk memindahkan.
        Beranda hanya menampilkan karya ber-★ Highlight ({featuredCount} di daftar ini); semua karya tampil di halaman{' '}
        <a href="/work" target="_blank" className="underline hover:text-black">/work</a>.
      </p>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat portfolio...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">Belum ada karya di sini. Klik “+ Tambah {kindLabel[kind]}”.</div>
        ) : (
          // Satu baris per karya
          visible.map((item, i) => {
            const cover = coverOf(item)
            return (
              <div key={item.id} className={`p-3 flex flex-wrap md:flex-nowrap items-center gap-3 ${item.is_published ? '' : 'opacity-60'}`}>
                {/* Tombol naik/turun. Nonaktif di baris paling atas/bawah */}
                <div className="flex flex-col">
                  <button onClick={() => move(item, -1)} disabled={busy || i === 0} className="w-7 h-6 rounded hover:bg-neutral-100 disabled:opacity-20 cursor-pointer text-sm" aria-label="Naikkan" title="Naikkan">↑</button>
                  <button onClick={() => move(item, 1)} disabled={busy || i === visible.length - 1} className="w-7 h-6 rounded hover:bg-neutral-100 disabled:opacity-20 cursor-pointer text-sm" aria-label="Turunkan" title="Turunkan">↓</button>
                </div>
                <span className="w-6 text-xs font-mono text-[#86868B] text-right">{String(i + 1).padStart(2, '0')}</span>
                {cover ? (
                  <img src={cover} alt="" className="w-16 h-11 object-cover rounded border border-black/10 shrink-0" />
                ) : (
                  <div className="w-16 h-11 rounded bg-gradient-to-br from-orange-300 to-slate-600 shrink-0" />
                )}
                <div className="flex-1 min-w-[100px]">
                  <div className="font-medium text-sm truncate">{item.title}</div>
                  <div className="text-xs text-[#86868B] truncate">
                    {[item.platform && platformLabel[item.platform], item.tag, item.subtitle, item.year].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {!item.is_published && <span className="text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">Disembunyikan</span>}
                <button
                  disabled={busy}
                  onClick={() => toggleFeatured(item)}
                  aria-pressed={!!item.is_featured}
                  title={item.is_featured ? 'Hapus dari beranda' : 'Tampilkan di beranda'}
                  className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition ${item.is_featured ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-black/10 text-[#86868B] hover:text-black hover:border-black/30'}`}
                >
                  {item.is_featured ? '★ Highlight' : '☆ Highlight'}
                </button>
                <div className="flex gap-3 text-xs shrink-0 w-full md:w-auto justify-end border-t md:border-0 border-black/5 pt-1 md:pt-0">
                  <button disabled={busy} onClick={() => togglePublished(item)} className="text-[#86868B] hover:text-black cursor-pointer">{item.is_published ? 'Sembunyikan' : 'Tampilkan'}</button>
                  <button disabled={busy} onClick={() => setDraft(item)} className="text-blue-600 hover:underline cursor-pointer">Edit</button>
                  <button disabled={busy} onClick={() => remove(item)} className="text-red-600 hover:underline cursor-pointer">Hapus</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ===== FORM TAMBAH / EDIT KARYA =====
function PortfolioEditor({ draft, busy, onCancel, onSave }: { draft: Draft; busy: boolean; onCancel: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(draft)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Ubah sebagian isi form
  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }))
  const isVideo = d.kind === 'video'
  const isWeb = d.kind === 'web'
  // Video YouTube tanpa gambar akan memakai thumbnail otomatis dari YouTube
  const autoThumb = isVideo && d.platform === 'youtube' && !d.image && youtubeId(d.link)

  // Upload gambar lewat fungsi yang sama dengan editor berita
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set({ image: await uploadImage(file) })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUploading(false)
    }
  }

  // Gambar pratinjau di sidebar form
  const preview = coverOf({ ...d, id: 0 } as PortfolioItem)

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSave(d) }}
    >
      <div>
        <button type="button" onClick={onCancel} className="text-xs text-[#86868B] hover:text-black cursor-pointer">← Kembali ke daftar portfolio</button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">{d.id ? 'Edit' : 'Tambah'} {kindLabel[d.kind]}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-black/[0.08] p-5 space-y-4">
          {/* Kolom yang tampil menyesuaikan jenis karya (isVideo / isWeb / desain) */}
          {isVideo && (
            <div>
              <label className={labelCls}>Platform *</label>
              <div className="flex gap-2">
                {(['instagram', 'youtube', 'tiktok'] as VideoPlatform[]).map((p) => (
                  <button type="button" key={p} onClick={() => set({ platform: p })} className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer ${d.platform === p ? 'bg-black text-white border-black' : 'border-black/15 hover:border-black'}`}>
                    {platformLabel[p]}
                  </button>
                ))}
              </div>
              <p className={hintCls}>Instagram → grid Reels · YouTube → daftar video panjang · TikTok → daftar TikTok.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Judul (English) *</label>
              <input className={inputCls} value={d.title} onChange={(e) => set({ title: e.target.value })} required maxLength={200} />
            </div>
            <div>
              <label className={labelCls}>Judul (Indonesia)</label>
              <input className={inputCls} value={d.title_id ?? ''} onChange={(e) => set({ title_id: e.target.value })} maxLength={200} placeholder="Kosongkan jika sama" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{d.kind === 'design' ? 'Kategori' : isWeb ? 'Stack / teknologi' : 'Judul asli / keterangan kecil'}</label>
              <input
                className={inputCls}
                value={d.subtitle ?? ''}
                onChange={(e) => set({ subtitle: e.target.value })}
                placeholder={d.kind === 'design' ? 'Campaign design / Social media' : isWeb ? 'Next.js · TypeScript · Supabase' : 'mis. judul asli video YouTube'}
              />
            </div>
            {d.kind === 'design' ? (
              <div>
                <label className={labelCls}>Tahun</label>
                <input className={inputCls} value={d.year ?? ''} onChange={(e) => set({ year: e.target.value })} placeholder="2026" maxLength={20} />
              </div>
            ) : isVideo ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Label (EN)</label>
                  <input className={inputCls} value={d.tag ?? ''} onChange={(e) => set({ tag: e.target.value })} placeholder="Audio" maxLength={60} />
                </div>
                <div>
                  <label className={labelCls}>Label (ID)</label>
                  <input className={inputCls} value={d.tag_id ?? ''} onChange={(e) => set({ tag_id: e.target.value })} placeholder="Audio" maxLength={60} />
                </div>
              </div>
            ) : null}
          </div>
          {isVideo && <p className={hintCls + ' -mt-2'}>Label Reels dipakai sebagai tombol filter di website (mis. Audio, Streaming setup, Gaming gear).</p>}

          <div>
            <label className={labelCls}>Deskripsi (English)</label>
            <textarea className={inputCls} rows={3} value={d.description ?? ''} onChange={(e) => set({ description: e.target.value })} maxLength={2000} />
          </div>
          <div>
            <label className={labelCls}>Deskripsi (Indonesia)</label>
            <textarea className={inputCls} rows={3} value={d.description_id ?? ''} onChange={(e) => set({ description_id: e.target.value })} maxLength={2000} placeholder="Kosongkan jika sama dengan versi English" />
          </div>

          <div>
            <label className={labelCls}>{isVideo ? 'Link video *' : isWeb ? 'Link utama (Live)' : 'Link (opsional)'}</label>
            <input className={inputCls} type="url" value={d.link ?? ''} onChange={(e) => set({ link: e.target.value })} required={isVideo} placeholder="https://..." />
          </div>

          {/* Link tambahan khusus proyek web: bisa ditambah, diubah, dan dihapus per baris */}
          {isWeb && (
            <div>
              <label className={labelCls}>Link tambahan</label>
              <div className="space-y-2">
                {d.extra_links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={inputCls + ' max-w-[120px]'} value={l.label} placeholder="GitHub" onChange={(e) => set({ extra_links: d.extra_links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input className={inputCls} type="url" value={l.href} placeholder="https://..." onChange={(e) => set({ extra_links: d.extra_links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })} />
                    <button type="button" onClick={() => set({ extra_links: d.extra_links.filter((_, j) => j !== i) })} className="text-red-600 text-xs px-2 cursor-pointer">Hapus</button>
                  </div>
                ))}
                <button type="button" onClick={() => set({ extra_links: [...d.extra_links, { label: '', href: '' }] })} className="text-xs text-blue-600 hover:underline cursor-pointer">+ Tambah link</button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3">
            <div className="font-semibold text-sm">{isWeb ? 'Screenshot' : isVideo ? 'Thumbnail' : 'Gambar karya'}</div>
            {preview ? (
              <img src={preview} alt="" className="w-full aspect-[16/10] object-cover rounded-lg border border-black/10" />
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-black/15 text-xs text-[#86868B] hover:border-black/40 hover:text-black cursor-pointer disabled:opacity-50">
                {uploading ? 'Mengunggah...' : '+ Pilih gambar'}
              </button>
            )}
            {autoThumb && <p className={hintCls}>Memakai thumbnail YouTube otomatis. Upload gambar untuk menggantinya.</p>}
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-blue-600 hover:underline cursor-pointer disabled:opacity-50">{uploading ? 'Mengunggah...' : d.image ? 'Ganti' : 'Upload'}</button>
              {d.image && <button type="button" onClick={() => set({ image: null })} className="text-red-600 hover:underline cursor-pointer">Hapus gambar</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
            <input className={inputCls + ' text-xs'} value={d.image ?? ''} onChange={(e) => set({ image: e.target.value || null })} placeholder="atau tempel URL gambar" />
            <div>
              <label className={labelCls}>Alt text</label>
              <input className={inputCls + ' text-xs'} value={d.image_alt ?? ''} onChange={(e) => set({ image_alt: e.target.value })} placeholder="Deskripsikan isi gambar" maxLength={300} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={d.is_published} onChange={(e) => set({ is_published: e.target.checked })} />
              Tampilkan di website
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!d.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} />
              ★ Highlight di beranda
            </label>
            <button type="submit" disabled={busy || uploading} className="w-full rounded-full bg-black text-white py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
              {busy ? 'Menyimpan...' : d.id ? 'Simpan perubahan' : 'Tambahkan'}
            </button>
            {!d.id && <p className={hintCls}>Karya baru masuk di urutan paling bawah. Atur posisinya dengan ↑ ↓ di daftar.</p>}
          </div>
        </aside>
      </div>
    </form>
  )
}
