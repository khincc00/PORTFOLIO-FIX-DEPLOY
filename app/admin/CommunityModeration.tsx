'use client'
/**
 * app/admin/CommunityModeration.tsx → menu KOMUNITAS di Admin (/admin) dan Studio (/studio, PWA iPhone).
 * Tiga tab:
 *   Kiriman  → semua kiriman anggota; buka untuk membaca isi, gambar, dan komentar, membalas sebagai admin, atau menghapus
 *   Buat     → membuat kiriman baru sebagai admin (teks + gambar)
 *   Laporan  → laporan dari anggota; hapus konten atau tutup laporan
 * Admin otomatis bertindak sebagai akun resmi "Khincc" (lihat getCommunityViewer di lib/community-server.ts).
 * Class seperti "flex gap-2 text-xs" adalah class Tailwind (lihat tailwind.config.js).
 */

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { adminFetch as fetch } from '@/lib/admin-fetch'
import { COMMUNITY_LIMITS as L, type PublicCommunityComment, type PublicPost } from '@/lib/community'

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

type Tab = 'posts' | 'new' | 'reports'
const when = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const errorOf = async (res: Response, fallback: string) => (await res.json().catch(() => ({}))).error || fallback

export default function CommunityModeration() {
  const [tab, setTab] = useState<Tab>('posts')
  const [reportCount, setReportCount] = useState<number | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Komunitas</h2>
        <p className="text-xs text-[#86868B] mt-1">
          Lihat semua yang dibagikan anggota, balas, buat kiriman, dan moderasi. Kamu tampil sebagai <strong>Khincc</strong> dengan lencana Admin. Halaman publik:{' '}
          <a href="/komunitas" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">/komunitas</a>.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 text-sm">
        {([['posts', 'Kiriman'], ['new', 'Buat kiriman'], ['reports', reportCount ? `Laporan (${reportCount})` : 'Laporan']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-full cursor-pointer transition ${tab === key ? 'bg-black text-white' : 'text-[#86868B] hover:text-black hover:bg-neutral-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' && <PostsTab />}
      {tab === 'new' && <NewPostTab onCreated={() => setTab('posts')} />}
      {tab === 'reports' && <ReportsTab onCount={setReportCount} />}
    </div>
  )
}

/* ---------- Tab Kiriman ---------- */

function PostsTab() {
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/community?scope=posts')
      .then(async (r) => {
        if (!r.ok) throw new Error(await errorOf(r, 'Gagal memuat kiriman'))
        setPosts(await r.json())
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const removePost = async (p: PublicPost) => {
    if (!confirm(`Hapus kiriman "${p.title}" beserta semua komentarnya secara permanen?`)) return
    const res = await fetch(`/api/community/posts?id=${p.id}`, { method: 'DELETE' })
    if (!res.ok) return alert(await errorOf(res, 'Gagal menghapus'))
    setPosts((list) => list.filter((x) => x.id !== p.id))
    setOpenId(null)
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Memuat kiriman...</div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#86868B]">Belum ada kiriman. Buat yang pertama di tab “Buat kiriman”.</div>
        ) : (
          posts.map((p) => (
            <div key={p.id}>
              <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="w-full text-left p-4 flex gap-3 items-start hover:bg-neutral-50 cursor-pointer">
                {p.images[0] && <img src={p.images[0]} alt="" className="w-14 h-14 object-cover rounded-lg shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868B]">
                    <strong className="text-sm text-black">{p.author.display_name}</strong>
                    {p.author.is_admin && <span className="px-2 py-0.5 rounded font-medium bg-orange-50 text-orange-700">Admin</span>}
                    <span>{when(p.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium mt-1 break-words">{p.title}</p>
                  <p className="text-xs text-[#86868B] mt-1">▲ {p.score} · 💬 {p.comment_count}{p.images.length ? ` · 🖼 ${p.images.length}` : ''}</p>
                </div>
                <span className="text-xs text-[#86868B] shrink-0">{openId === p.id ? 'Tutup' : 'Buka'}</span>
              </button>
              {openId === p.id && <PostDetail post={p} onDelete={() => removePost(p)} onCommentCount={(n) => setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, comment_count: n } : x)))} />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function PostDetail({ post, onDelete, onCommentCount }: { post: PublicPost; onDelete: () => void; onCommentCount: (n: number) => void }) {
  const [comments, setComments] = useState<PublicCommunityComment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<number | 'root' | null>('root')

  useEffect(() => {
    fetch(`/api/admin/community?scope=comments&post_id=${post.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await errorOf(r, 'Gagal memuat komentar'))
        setComments(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [post.id])

  useEffect(() => { if (comments) onCommentCount(comments.length) }, [comments]) // eslint-disable-line react-hooks/exhaustive-deps

  const removeComment = async (c: PublicCommunityComment) => {
    if (!confirm('Hapus komentar ini beserta balasannya secara permanen?')) return
    const res = await fetch(`/api/community/comments?id=${c.id}`, { method: 'DELETE' })
    if (!res.ok) return alert(await errorOf(res, 'Gagal menghapus'))
    setComments((list) => {
      const doomed = new Set([c.id])
      let grew = true
      while (grew) {
        grew = false
        for (const x of list || []) if (x.parent_id && doomed.has(x.parent_id) && !doomed.has(x.id)) { doomed.add(x.id); grew = true }
      }
      return (list || []).filter((x) => !doomed.has(x.id))
    })
  }

  const byParent = (parent: number | null) => (comments || []).filter((c) => c.parent_id === parent)
  const renderThread = (parent: number | null, depth: number): React.ReactNode =>
    byParent(parent).map((c) => (
      <div key={c.id} style={{ marginLeft: Math.min(depth, 4) * 16 }} className={depth ? 'border-l-2 border-black/10 pl-3' : ''}>
        <div className="py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868B]">
            <strong className="text-sm text-black">{c.author.display_name}</strong>
            {c.author.is_admin && <span className="px-2 py-0.5 rounded font-medium bg-orange-50 text-orange-700">Admin</span>}
            <span>{when(c.created_at)}</span>
            <span>▲ {c.score}</span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.body}</p>
          <div className="flex gap-3 text-xs mt-1">
            <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-blue-600 hover:underline cursor-pointer">Balas</button>
            <button onClick={() => removeComment(c)} className="text-red-600 hover:underline cursor-pointer">Hapus</button>
          </div>
          {replyTo === c.id && <ReplyBox postId={post.id} parentId={c.id} onDone={(n) => { setComments((l) => [...(l || []), n]); setReplyTo(null) }} />}
        </div>
        {renderThread(c.id, depth + 1)}
      </div>
    ))

  return (
    <div className="px-4 pb-5 pt-1 bg-neutral-50/60 space-y-4">
      {post.body && <p className="text-sm whitespace-pre-wrap break-words">{post.body}</p>}
      {post.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" className="h-32 rounded-lg object-cover" /></a>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-xs">
        <a href={`/komunitas/${post.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Buka di website ↗</a>
        <button onClick={onDelete} className="text-red-600 hover:underline cursor-pointer">Hapus kiriman</button>
      </div>

      <div className="border-t border-black/[0.06] pt-3">
        <p className="text-xs font-semibold mb-1">Komentar {comments ? `(${comments.length})` : ''}</p>
        {error && <p className="text-xs text-red-700">{error}</p>}
        {!comments && !error && <p className="text-xs text-[#86868B]">Memuat komentar...</p>}
        {comments && comments.length === 0 && <p className="text-xs text-[#86868B]">Belum ada komentar.</p>}
        {renderThread(null, 0)}
        {comments && (replyTo === 'root'
          ? <ReplyBox postId={post.id} parentId={null} onDone={(n) => setComments((l) => [...(l || []), n])} />
          : <button onClick={() => setReplyTo('root')} className="text-xs text-blue-600 hover:underline cursor-pointer mt-2">+ Tulis komentar baru</button>)}
      </div>
    </div>
  )
}

function ReplyBox({ postId, parentId, onDone }: { postId: number; parentId: number | null; onDone: (c: PublicCommunityComment) => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, parent_id: parentId, body }),
      })
      if (!res.ok) throw new Error(await errorOf(res, 'Gagal mengirim'))
      const r = await res.json()
      if (r.comment) onDone(r.comment)
      setBody('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={L.commentMax} rows={3} required placeholder="Balas sebagai Khincc (Admin)..." className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black" />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50">{busy ? 'Mengirim...' : 'Kirim'}</button>
    </form>
  )
}

/* ---------- Tab Buat kiriman ---------- */

function NewPostTab({ onCreated }: { onCreated: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (images.length >= L.maxImages) break
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/community/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error(await errorOf(res, 'Upload gagal'))
        const r = await res.json()
        setImages((list) => (list.length < L.maxImages ? [...list, r.url] : list))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, images }),
      })
      if (!res.ok) throw new Error(await errorOf(res, 'Gagal mengirim'))
      setTitle(''); setBody(''); setImages([])
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5 space-y-4">
      <p className="text-xs text-[#86868B]">Kiriman tampil di /komunitas atas nama <strong>Khincc</strong> dengan lencana Admin.</p>
      <label className="block text-xs font-semibold">Judul
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={L.titleMax} required className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm font-normal outline-none focus:border-black" />
      </label>
      <label className="block text-xs font-semibold">Teks (opsional)
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={L.bodyMax} rows={6} className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm font-normal outline-none focus:border-black" />
      </label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src) => (
            <div key={src} className="relative">
              <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg" />
              <button type="button" onClick={() => setImages(images.filter((i) => i !== src))} aria-label="Hapus gambar" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white text-sm leading-none cursor-pointer">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button type="button" disabled={uploading || images.length >= L.maxImages} onClick={() => fileInput.current?.click()} className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50">
          {uploading ? 'Mengunggah...' : '＋ Tambah gambar'}
        </button>
        <span className="text-[11px] text-[#86868B]">JPG, PNG, WEBP, GIF · maks. {L.maxImages} gambar · 4MB per gambar</span>
      </div>
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy || uploading} className="rounded-full bg-black text-white px-5 py-2 text-sm font-medium cursor-pointer disabled:opacity-50">{busy ? 'Mengirim...' : 'Kirim kiriman'}</button>
    </form>
  )
}

/* ---------- Tab Laporan ---------- */

function ReportsTab({ onCount }: { onCount: (n: number) => void }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const set = useCallback((list: Report[]) => { setReports(list); onCount(list.length) }, [onCount])

  useEffect(() => {
    fetch('/api/admin/community')
      .then(async (r) => {
        if (!r.ok) throw new Error(await errorOf(r, 'Gagal memuat laporan'))
        set(await r.json())
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [set])

  const dismiss = async (r: Report) => {
    const res = await fetch(`/api/admin/community?id=${r.id}`, { method: 'DELETE' })
    if (!res.ok) return alert(await errorOf(res, 'Gagal menutup laporan'))
    set(reports.filter((x) => x.id !== r.id))
  }

  const removeContent = async (r: Report) => {
    if (!confirm(`Hapus ${r.target_type === 'post' ? 'kiriman' : 'komentar'} dari @${r.author} secara permanen?`)) return
    const res = await fetch(`/api/community/${r.target_type === 'post' ? 'posts' : 'comments'}?id=${r.target_id}`, { method: 'DELETE' })
    if (!res.ok) return alert(await errorOf(res, 'Gagal menghapus'))
    set(reports.filter((x) => !(x.target_type === r.target_type && x.target_id === r.target_id)))
  }

  return (
    <div className="space-y-3">
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
                  <span className="text-[#86868B]">dilaporkan @{r.reporter} · {when(r.created_at)}</span>
                </div>
                {r.reason && <p className="text-xs mt-1.5 text-red-700">Alasan: {r.reason}</p>}
                <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{r.excerpt ?? '(konten sudah dihapus)'}</p>
                {r.post_id && r.excerpt && <a href={`/komunitas/${r.post_id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1.5 inline-block">Buka ↗</a>}
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
