'use client'
/**
 * app/admin/GameManager.tsx → menu GAMES di admin.
 *
 * Dua bagian:
 * 1. GameManager (daftar): tombol ↑ ↓ untuk urutan, Sembunyikan, Edit, Hapus.
 * 2. GameEditor (form): nama, stack, gambar, deskripsi, link main, dan link official.
 * Semua perubahan disimpan lewat /api/admin/games. Halaman publik /games membaca dari /api/games.
 */

import { useEffect, useRef, useState } from 'react'
import { adminFetch as fetch } from '@/lib/admin-fetch'
import { uploadImage } from './NewsEditor'
import type { Game, GameInput } from '@/lib/games'

// Class Tailwind yang dipakai berulang di form
const inputCls = 'w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black bg-white'
const labelCls = 'block text-xs font-semibold mb-1'
const hintCls = 'text-[11px] text-[#86868B] mt-1'

// Isi form: data game, dengan id kalau sedang mengedit game yang sudah ada
type Draft = GameInput & { id?: number }

const emptyDraft: Draft = {
  title: '',
  stack: '',
  description: '',
  image: '',
  play_url: '',
  official_url: '',
  official_label: '',
  is_published: true,
}

// Ubah game dari server menjadi isi form (kolom kosong dari database = '')
const toDraft = (game: Game): Draft => ({
  id: game.id,
  title: game.title,
  stack: game.stack ?? '',
  description: game.description ?? '',
  image: game.image ?? '',
  play_url: game.play_url,
  official_url: game.official_url,
  official_label: game.official_label ?? '',
  is_published: game.is_published,
})

export default function GameManager() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null) // berisi data = form terbuka; null = daftar
  const [busy, setBusy] = useState(false)

  // Ambil semua game dari server
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/games')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat games')
      setGames(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Urutan tampil = urutan di halaman /games
  const sorted = [...games].sort((a, b) => a.position - b.position)

  // Tukar posisi dengan tetangga, lalu simpan seluruh urutan. Kalau server gagal, dikembalikan
  const move = async (index: number, dir: -1 | 1) => {
    if (busy) return
    const neighbour = sorted[index + dir]
    if (!neighbour) return
    const order = [...sorted]
    ;[order[index], order[index + dir]] = [order[index + dir], order[index]]
    const previous = games
    setBusy(true)
    setGames(order.map((g, position) => ({ ...g, position })))
    try {
      const res = await fetch('/api/admin/games/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: order.map((g) => g.id) }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan urutan')
    } catch (e) {
      setGames(previous)
      setError(e instanceof Error ? e.message : 'Koneksi terputus. Urutan dikembalikan.')
    } finally {
      setBusy(false)
    }
  }

  // Simpan game: sudah punya id → PUT (ubah), belum → POST (baru)
  const save = async (payload: Draft) => {
    if (busy) return false
    setBusy(true)
    try {
      const res = await fetch(payload.id ? `/api/admin/games/${payload.id}` : '/api/admin/games', {
        method: payload.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setGames((list) => [...list.filter((g) => g.id !== data.id), data])
      return true
    } catch (e: any) {
      alert(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  // Tombol cepat di daftar: tampilkan / sembunyikan dari halaman /games
  const togglePublished = (game: Game) => save({ ...toDraft(game), is_published: !game.is_published })

  // Hapus game permanen setelah konfirmasi
  const remove = async (game: Game) => {
    if (busy) return
    if (!confirm(`Hapus "${game.title}" dari katalog games?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menghapus')
      setGames((list) => list.filter((g) => g.id !== game.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  // Kalau form terbuka, tampilkan form saja (daftar disembunyikan)
  if (draft) {
    return (
      <GameEditor
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
        <h2 className="text-2xl font-semibold tracking-tight">Games</h2>
        <button
          disabled={busy}
          onClick={() => setDraft({ ...emptyDraft })}
          className="bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-neutral-800 transition cursor-pointer"
        >
          + Tambah Game
        </button>
      </div>

      <p className="text-xs text-[#86868B]">
        Urutan di sini = urutan di halaman{' '}
        <a href="/games" target="_blank" className="underline hover:text-black">/games</a>. Gunakan ↑ ↓ untuk memindahkan.
        Game yang disembunyikan tidak tampil di website.
      </p>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat games...</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">Belum ada game. Klik “+ Tambah Game”.</div>
        ) : (
          // Satu baris per game
          sorted.map((game, i) => (
            <div key={game.id} className={`p-3 flex flex-wrap md:flex-nowrap items-center gap-3 ${game.is_published ? '' : 'opacity-60'}`}>
              {/* Tombol naik/turun. Nonaktif di baris paling atas/bawah */}
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="w-7 h-6 rounded hover:bg-neutral-100 disabled:opacity-20 cursor-pointer text-sm" aria-label="Naikkan" title="Naikkan">↑</button>
                <button onClick={() => move(i, 1)} disabled={busy || i === sorted.length - 1} className="w-7 h-6 rounded hover:bg-neutral-100 disabled:opacity-20 cursor-pointer text-sm" aria-label="Turunkan" title="Turunkan">↓</button>
              </div>
              <span className="w-6 text-xs font-mono text-[#86868B] text-right">{String(i + 1).padStart(2, '0')}</span>
              {game.image ? (
                <img src={game.image} alt="" className="w-16 h-11 object-cover rounded border border-black/10 shrink-0" />
              ) : (
                <div className="w-16 h-11 rounded bg-gradient-to-br from-orange-300 to-slate-600 shrink-0" />
              )}
              <div className="flex-1 min-w-[100px]">
                <div className="font-medium text-sm truncate">{game.title}</div>
                <div className="text-xs text-[#86868B] truncate">{game.stack || 'Tanpa stack'}</div>
              </div>
              {!game.is_published && <span className="text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">Disembunyikan</span>}
              <div className="flex gap-3 text-xs shrink-0 w-full md:w-auto justify-end border-t md:border-0 border-black/5 pt-1 md:pt-0">
                <button disabled={busy} onClick={() => togglePublished(game)} className="text-[#86868B] hover:text-black cursor-pointer">{game.is_published ? 'Sembunyikan' : 'Tampilkan'}</button>
                <button disabled={busy} onClick={() => setDraft(toDraft(game))} className="text-blue-600 hover:underline cursor-pointer">Edit</button>
                <button disabled={busy} onClick={() => remove(game)} className="text-red-600 hover:underline cursor-pointer">Hapus</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== FORM TAMBAH / EDIT GAME =====
function GameEditor({ draft, busy, onCancel, onSave }: { draft: Draft; busy: boolean; onCancel: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(draft)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Ubah sebagian isi form
  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }))

  // Upload gambar lewat fungsi yang sama dengan editor berita dan portfolio
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

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSave(d) }}
    >
      <div>
        <button type="button" onClick={onCancel} className="text-xs text-[#86868B] hover:text-black cursor-pointer">← Kembali ke daftar games</button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">{d.id ? 'Edit' : 'Tambah'} Game</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-black/[0.08] p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nama game *</label>
              <input className={inputCls} value={d.title} onChange={(e) => set({ title: e.target.value })} required maxLength={120} placeholder="CodeQuest — Small Studio" />
            </div>
            <div>
              <label className={labelCls}>Stack</label>
              <input className={inputCls} value={d.stack} onChange={(e) => set({ stack: e.target.value })} maxLength={120} placeholder="HTML · CSS · JavaScript" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Deskripsi</label>
            <textarea className={inputCls} rows={4} value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={1000} />
          </div>

          <div>
            <label className={labelCls}>Link main *</label>
            <input className={inputCls} type="url" value={d.play_url} onChange={(e) => set({ play_url: e.target.value })} required placeholder="https://..." />
            <p className={hintCls}>Alamat yang dibuka di pemutar di halaman /games. Game harus mengizinkan dibuka di dalam iframe.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Link official *</label>
              <input className={inputCls} type="url" value={d.official_url} onChange={(e) => set({ official_url: e.target.value })} required placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Nama tombol official</label>
              <input className={inputCls} value={d.official_label} onChange={(e) => set({ official_label: e.target.value })} maxLength={40} placeholder="itch.io" />
              <p className={hintCls}>Kosongkan untuk memakai nama domain.</p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3">
            <div className="font-semibold text-sm">Gambar cover *</div>
            {d.image ? (
              <img src={d.image} alt="" className="w-full aspect-[16/10] object-cover rounded-lg border border-black/10" />
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-black/15 text-xs text-[#86868B] hover:border-black/40 hover:text-black cursor-pointer disabled:opacity-50">
                {uploading ? 'Mengunggah...' : '+ Pilih gambar'}
              </button>
            )}
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-blue-600 hover:underline cursor-pointer disabled:opacity-50">{uploading ? 'Mengunggah...' : d.image ? 'Ganti' : 'Upload'}</button>
              {d.image && <button type="button" onClick={() => set({ image: '' })} className="text-red-600 hover:underline cursor-pointer">Hapus gambar</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
            <input className={inputCls + ' text-xs'} value={d.image} onChange={(e) => set({ image: e.target.value })} placeholder="atau tempel URL gambar" />
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={d.is_published} onChange={(e) => set({ is_published: e.target.checked })} />
              Tampilkan di halaman /games
            </label>
            <button type="submit" disabled={busy || uploading} className="w-full rounded-full bg-black text-white py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
              {busy ? 'Menyimpan...' : d.id ? 'Simpan perubahan' : 'Tambahkan'}
            </button>
            {!d.id && <p className={hintCls}>Game baru masuk di urutan paling bawah. Atur posisinya dengan ↑ ↓ di daftar.</p>}
          </div>
        </aside>
      </div>
    </form>
  )
}
