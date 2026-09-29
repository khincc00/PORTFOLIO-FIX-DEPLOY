'use client'

import { useEffect, useRef, useState } from 'react'
import { newsCategories, slugify, stripHtml, type NewsPost } from '@/lib/news'

interface Props {
  post: NewsPost | null // null = berita baru
  onSaved: (post: NewsPost) => void
  onCancel: () => void
}

type Draft = {
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  category: string
  tags: string
  published_at: string // nilai input datetime-local
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const fromPost = (post: NewsPost | null): Draft => ({
  title: post?.title || '',
  slug: post?.slug || '',
  excerpt: post?.excerpt || '',
  content: post?.content || '',
  cover_image: post?.cover_image || '',
  category: post?.category || 'Update',
  tags: (post?.tags || []).join(', '),
  published_at: toLocalInput(post?.published_at || null),
})

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload gagal')
  return data.url
}

const toolbar: { label: string; title: string; cmd: string; arg?: string; className?: string }[] = [
  { label: 'P', title: 'Paragraf', cmd: 'formatBlock', arg: 'p' },
  { label: 'H2', title: 'Judul 2', cmd: 'formatBlock', arg: 'h2' },
  { label: 'H3', title: 'Judul 3', cmd: 'formatBlock', arg: 'h3' },
  { label: 'B', title: 'Tebal (Ctrl+B)', cmd: 'bold', className: 'font-bold' },
  { label: 'I', title: 'Miring (Ctrl+I)', cmd: 'italic', className: 'italic' },
  { label: 'U', title: 'Garis bawah (Ctrl+U)', cmd: 'underline', className: 'underline' },
  { label: 'S', title: 'Coret', cmd: 'strikeThrough', className: 'line-through' },
  { label: '• List', title: 'Daftar poin', cmd: 'insertUnorderedList' },
  { label: '1. List', title: 'Daftar bernomor', cmd: 'insertOrderedList' },
  { label: '❝', title: 'Kutipan', cmd: 'formatBlock', arg: 'blockquote' },
  { label: '—', title: 'Garis pemisah', cmd: 'insertHorizontalRule' },
  { label: '↶', title: 'Undo', cmd: 'undo' },
  { label: '↷', title: 'Redo', cmd: 'redo' },
  { label: 'Tx', title: 'Hapus format', cmd: 'removeFormat' },
]

export default function NewsEditor({ post, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<Draft>(() => fromPost(post))
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const inlineImageRef = useRef<HTMLInputElement>(null)

  // Load content into the contentEditable area on mount and when switching back to visual mode
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) editorRef.current.innerHTML = draft.content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const syncFromEditor = () => {
    if (editorRef.current) update({ content: editorRef.current.innerHTML })
  }

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    syncFromEditor()
  }

  const insertLink = () => {
    const url = window.prompt('Masukkan URL tautan (https://...)')
    if (url) exec('createLink', url)
  }

  const handleInlineImage = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const url = await uploadImage(file)
      exec('insertImage', url)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setUploading(false)
    }
  }

  const handleCover = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      update({ cover_image: await uploadImage(file) })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setUploading(false)
    }
  }

  const save = async (status: 'draft' | 'published') => {
    const content = mode === 'visual' && editorRef.current ? editorRef.current.innerHTML : draft.content
    if (!draft.title.trim()) {
      setMessage({ type: 'error', text: 'Judul berita wajib diisi.' })
      return
    }
    if (status === 'published' && !stripHtml(content)) {
      setMessage({ type: 'error', text: 'Isi berita masih kosong.' })
      return
    }

    setSaving(status)
    setMessage(null)
    try {
      const res = await fetch(post ? `/api/admin/news/${post.id}` : '/api/admin/news', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          content,
          status,
          published_at: draft.published_at ? new Date(draft.published_at).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan berita')

      setDirty(false)
      setDraft(fromPost(data))
      if (editorRef.current && mode === 'visual') editorRef.current.innerHTML = data.content
      setMessage({ type: 'ok', text: status === 'published' ? 'Berita berhasil diterbitkan.' : 'Draft tersimpan.' })
      onSaved(data)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(null)
    }
  }

  const words = stripHtml(draft.content).split(' ').filter(Boolean).length
  const isScheduled = draft.published_at && new Date(draft.published_at) > new Date()
  const publishLabel = post?.status === 'published' ? 'Perbarui' : isScheduled ? 'Jadwalkan' : 'Terbitkan'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => (!dirty || confirm('Perubahan belum disimpan. Tetap keluar?')) && onCancel()} className="text-xs text-[#86868B] hover:text-black transition cursor-pointer">
            ← Kembali ke daftar berita
          </button>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">{post ? 'Edit Berita' : 'Tambah Berita Baru'}</h2>
        </div>
        {post?.status === 'published' && (
          <a href={`/berita/${post.slug}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
            Lihat berita ↗
          </a>
        )}
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${message.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Kolom utama */}
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl border border-black/[0.08] p-5 space-y-2">
            <input
              value={draft.title}
              onChange={(e) => update({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              placeholder="Tambahkan judul"
              className="w-full text-2xl md:text-3xl font-semibold tracking-tight outline-none placeholder:text-neutral-300"
            />
            <div className="flex flex-wrap items-center gap-1 text-xs text-[#86868B]">
              <span>Permalink: /berita/</span>
              <input
                value={draft.slug}
                onChange={(e) => { setSlugTouched(true); update({ slug: e.target.value }) }}
                onBlur={() => update({ slug: slugify(draft.slug) || slugify(draft.title) })}
                placeholder="slug-otomatis"
                className="flex-1 min-w-[160px] bg-neutral-50 border border-black/10 rounded px-2 py-1 font-mono text-[11px] outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.08] bg-[#F5F5F7] p-2">
              {mode === 'visual' && (
                <>
                  {toolbar.map((t) => (
                    <button
                      key={t.title}
                      type="button"
                      title={t.title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => exec(t.cmd, t.arg)}
                      className={`min-w-[32px] h-8 px-2 rounded-md text-xs hover:bg-white border border-transparent hover:border-black/10 transition cursor-pointer ${t.className || ''}`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button type="button" title="Sisipkan tautan" onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="h-8 px-2 rounded-md text-xs hover:bg-white border border-transparent hover:border-black/10 cursor-pointer">🔗 Link</button>
                  <button type="button" title="Sisipkan gambar" onMouseDown={(e) => e.preventDefault()} onClick={() => inlineImageRef.current?.click()} disabled={uploading} className="h-8 px-2 rounded-md text-xs hover:bg-white border border-transparent hover:border-black/10 cursor-pointer disabled:opacity-50">🖼 Gambar</button>
                  <input ref={inlineImageRef} type="file" accept="image/*" hidden onChange={(e) => { handleInlineImage(e.target.files?.[0]); e.target.value = '' }} />
                </>
              )}
              <div className="ml-auto flex rounded-md border border-black/10 overflow-hidden text-xs">
                {(['visual', 'html'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { if (mode === 'visual') syncFromEditor(); setMode(m) }}
                    className={`px-3 h-8 cursor-pointer ${mode === m ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
                  >
                    {m === 'visual' ? 'Visual' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'visual' ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromEditor}
                data-placeholder="Mulai menulis berita di sini..."
                className="news-editor news-body min-h-[420px] p-6 outline-none"
              />
            ) : (
              <textarea
                value={draft.content}
                onChange={(e) => update({ content: e.target.value })}
                className="w-full min-h-[420px] p-6 font-mono text-xs outline-none resize-y"
                spellCheck={false}
              />
            )}
            <div className="border-t border-black/[0.08] px-4 py-2 text-[11px] text-[#86868B] flex justify-between">
              <span>Jumlah kata: {words}</span>
              {uploading && <span>Mengunggah gambar...</span>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-5">
            <label className="text-sm font-semibold">Ringkasan (Excerpt)</label>
            <p className="text-xs text-[#86868B] mt-0.5 mb-2">Tampil di kartu berita. Kosongkan untuk dibuat otomatis dari isi.</p>
            <textarea
              value={draft.excerpt}
              onChange={(e) => update({ excerpt: e.target.value })}
              rows={3}
              maxLength={300}
              className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black resize-y"
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.08] font-semibold text-sm">Terbitkan</div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Status</span>
                <span className="font-medium">{post?.status === 'published' ? 'Terbit' : post ? 'Draft' : 'Belum disimpan'}</span>
              </div>
              <div>
                <label className="text-[#86868B] block mb-1">Tanggal terbit</label>
                <input
                  type="datetime-local"
                  value={draft.published_at}
                  onChange={(e) => update({ published_at: e.target.value })}
                  className="w-full rounded-lg border border-black/15 px-2 py-1.5 outline-none focus:border-black"
                />
                <p className="text-[#86868B] mt-1">Kosong = terbit sekarang. Isi tanggal mendatang untuk menjadwalkan.</p>
              </div>
            </div>
            <div className="flex gap-2 p-4 bg-[#F5F5F7] border-t border-black/[0.08]">
              <button
                onClick={() => save('draft')}
                disabled={!!saving || uploading}
                className="flex-1 rounded-full border border-black/15 bg-white py-2 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50 cursor-pointer"
              >
                {saving === 'draft' ? 'Menyimpan...' : post?.status === 'published' ? 'Jadikan Draft' : 'Simpan Draft'}
              </button>
              <button
                onClick={() => save('published')}
                disabled={!!saving || uploading}
                className="flex-1 rounded-full bg-black text-white py-2 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {saving === 'published' ? 'Menyimpan...' : publishLabel}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-2">
            <div className="font-semibold text-sm">Kategori</div>
            <input
              list="news-categories"
              value={draft.category}
              onChange={(e) => update({ category: e.target.value })}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-xs outline-none focus:border-black"
            />
            <datalist id="news-categories">
              {newsCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-2">
            <div className="font-semibold text-sm">Tag</div>
            <input
              value={draft.tags}
              onChange={(e) => update({ tags: e.target.value })}
              placeholder="review, audio, gear"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-xs outline-none focus:border-black"
            />
            <p className="text-[11px] text-[#86868B]">Pisahkan dengan koma.</p>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3">
            <div className="font-semibold text-sm">Gambar Unggulan</div>
            {draft.cover_image ? (
              <>
                <img src={draft.cover_image} alt="" className="w-full aspect-[16/10] object-cover rounded-lg border border-black/10" />
                <div className="flex gap-3 text-xs">
                  <button onClick={() => coverInputRef.current?.click()} className="text-blue-600 hover:underline cursor-pointer">Ganti</button>
                  <button onClick={() => update({ cover_image: '' })} className="text-red-600 hover:underline cursor-pointer">Hapus</button>
                </div>
              </>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-black/15 text-xs text-[#86868B] hover:border-black/40 hover:text-black transition cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Mengunggah...' : '+ Pilih gambar unggulan'}
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e) => { handleCover(e.target.files?.[0]); e.target.value = '' }} />
            <input
              value={draft.cover_image}
              onChange={(e) => update({ cover_image: e.target.value })}
              placeholder="atau tempel URL gambar https://..."
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-[11px] outline-none focus:border-black"
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
