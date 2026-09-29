'use client'

import { FormEvent, useEffect, useState } from 'react'
import { COMMENT_LIMITS, REACTIONS, type InteractionsPayload, type PublicComment } from '@/lib/interactions'

type Mode = 'guest' | 'login' | 'register'

const GUEST_NAME_KEY = 'khincc_guest_name'

const readStorage = (key: string) => {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}
const writeStorage = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch {}
}

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'baru saja'
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const avatarHue = (name: string) => Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

const badges = { admin: 'Penulis', member: 'Member', guest: 'Tamu' }

export default function NewsInteractions({ slug }: { slug: string }) {
  const [data, setData] = useState<InteractionsPayload | null>(null)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState<Mode>('guest')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [asAdmin, setAsAdmin] = useState(true)
  const [account, setAccount] = useState({ username: '', password: '', display_name: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const api = `/api/news/${encodeURIComponent(slug)}`

  useEffect(() => {
    setName(readStorage(GUEST_NAME_KEY))
    fetch(`${api}/interactions`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Gagal memuat komentar')
        setData(d)
      })
      .catch((e) => setLoadError(e.message))
  }, [api])

  const react = async (emoji: string) => {
    if (!data) return
    const wasActive = data.mine.includes(emoji)
    // Optimistic update, then reconcile with the server count
    setData({
      ...data,
      mine: wasActive ? data.mine.filter((e) => e !== emoji) : [...data.mine, emoji],
      reactions: { ...data.reactions, [emoji]: Math.max(0, (data.reactions[emoji] || 0) + (wasActive ? -1 : 1)) },
    })
    try {
      const res = await fetch(`${api}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error)
      setData((d) => d && {
        ...d,
        mine: r.active ? Array.from(new Set([...d.mine, emoji])) : d.mine.filter((e) => e !== emoji),
        reactions: { ...d.reactions, [emoji]: r.count },
      })
    } catch {
      setData((d) => d && { ...d, mine: data.mine, reactions: data.reactions })
    }
  }

  const submitComment = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`${api}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body, website: honeypot, as_admin: data?.isAdmin && asAdmin }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || 'Gagal mengirim komentar')
      if (r.comment) setData((d) => d && { ...d, comments: [...d.comments, r.comment] })
      if (!data?.user) writeStorage(GUEST_NAME_KEY, name)
      setBody('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/account/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || 'Gagal masuk')
      setAccount({ username: '', password: '', display_name: '' })
      setMode('guest')
      // Reload so "can delete" flags and reactions reflect the account
      const fresh = await fetch(`${api}/interactions`).then((x) => x.json())
      setData(fresh)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/account', { method: 'DELETE' })
    const fresh = await fetch(`${api}/interactions`).then((x) => x.json())
    setData(fresh)
  }

  const remove = async (comment: PublicComment) => {
    if (!confirm('Hapus komentar ini?')) return
    const res = await fetch(`${api}/comments?id=${comment.id}`, { method: 'DELETE' })
    if (res.ok) setData((d) => d && { ...d, comments: d.comments.filter((c) => c.id !== comment.id) })
    else alert((await res.json()).error || 'Gagal menghapus komentar')
  }

  if (loadError) return null

  const totalReactions = data ? Object.values(data.reactions).reduce((a, b) => a + b, 0) : 0

  return (
    <section className="ni" id="komentar" aria-label="Reaksi dan komentar">
      <div className="ni-reactions">
        <p className="eyebrow">Bagaimana menurutmu? {totalReactions > 0 && <span>· {totalReactions} reaksi</span>}</p>
        <div className="ni-reaction-row">
          {REACTIONS.map((emoji) => {
            const active = data?.mine.includes(emoji)
            return (
              <button
                key={emoji}
                type="button"
                disabled={!data}
                onClick={() => react(emoji)}
                className={active ? 'is-active' : ''}
                aria-pressed={!!active}
                aria-label={`Reaksi ${emoji}`}
              >
                <span>{emoji}</span>
                {!!data?.reactions[emoji] && <b>{data.reactions[emoji]}</b>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ni-head">
        <h2>Komentar {data && <span>{data.comments.length}</span>}</h2>
      </div>

      <div className="ni-form">
        {data?.user || data?.isAdmin ? (
          <div className="ni-identity">
            {data.isAdmin ? (
              <label className="ni-check">
                <input type="checkbox" checked={asAdmin} onChange={(e) => setAsAdmin(e.target.checked)} />
                Balas sebagai <strong>Penulis</strong>
              </label>
            ) : null}
            {data.user && (!data.isAdmin || !asAdmin) && (
              <span>Berkomentar sebagai <strong>{data.user.display_name}</strong> <em>@{data.user.username}</em></span>
            )}
            {data.user && <button type="button" onClick={logout}>Keluar</button>}
          </div>
        ) : (
          <div className="ni-tabs" role="tablist">
            {([['guest', 'Tanpa akun'], ['login', 'Masuk'], ['register', 'Daftar akun']] as [Mode, string][]).map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-active' : ''} onClick={() => { setMode(m); setError('') }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {mode !== 'guest' && !data?.user && !data?.isAdmin ? (
          <form onSubmit={submitAccount} className="ni-fields">
            <label>Username
              <input value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} autoComplete="username" placeholder="contoh: budi_22" required />
            </label>
            {mode === 'register' && (
              <label>Nama tampilan <small>(opsional, boleh samaran)</small>
                <input value={account.display_name} onChange={(e) => setAccount({ ...account, display_name: e.target.value })} maxLength={COMMENT_LIMITS.nameMax} placeholder="Nama yang tampil di komentar" />
              </label>
            )}
            <label>Password
              <input type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} required />
            </label>
            {mode === 'register' && <p className="ni-note">Tanpa email. Akun membuat namamu tidak bisa dipakai orang lain dan komentarmu bisa kamu hapus dari perangkat mana pun. Simpan password baik-baik, karena belum ada fitur reset.</p>}
            {error && <p className="ni-error">{error}</p>}
            <button type="submit" className="ni-submit" disabled={busy}>{busy ? 'Memproses...' : mode === 'register' ? 'Daftar & lanjut komentar' : 'Masuk'}</button>
          </form>
        ) : (
          <form onSubmit={submitComment} className="ni-fields">
            {!data?.user && !(data?.isAdmin && asAdmin) && (
              <label>Nama <small>(bebas, asli atau samaran)</small>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={COMMENT_LIMITS.nameMax} placeholder="Nama kamu" required />
              </label>
            )}
            <label>Komentar
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={COMMENT_LIMITS.bodyMax} rows={4} placeholder="Tulis komentar..." required />
            </label>
            {/* Honeypot for bots; hidden from people and screen readers */}
            <input className="ni-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
            {error && <p className="ni-error">{error}</p>}
            <div className="ni-actions">
              <span>{body.length}/{COMMENT_LIMITS.bodyMax}</span>
              <button type="submit" className="ni-submit" disabled={busy || !data}>{busy ? 'Mengirim...' : 'Kirim komentar'}</button>
            </div>
          </form>
        )}
      </div>

      <div className="ni-list">
        {!data ? (
          <p className="ni-empty">Memuat komentar...</p>
        ) : data.comments.length === 0 ? (
          <p className="ni-empty">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          data.comments.map((c) => (
            <article key={c.id} className={`ni-comment ${c.author_type === 'admin' ? 'is-admin' : ''}`}>
              <div className="ni-avatar" style={c.author_type === 'admin' ? undefined : { background: `hsl(${avatarHue(c.author_name)} 45% 42%)` }}>
                {c.author_name.charAt(0).toUpperCase()}
              </div>
              <div className="ni-comment-body">
                <div className="ni-comment-meta">
                  <strong>{c.author_name}</strong>
                  <span className={`ni-badge is-${c.author_type}`}>{c.author_type === 'member' ? '✓ ' : ''}{badges[c.author_type]}</span>
                  <time dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                  {c.can_delete && <button type="button" onClick={() => remove(c)}>Hapus</button>}
                </div>
                <p>{c.body}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
