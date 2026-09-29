'use client'
/**
 * app/berita/[slug]/NewsInteractions.tsx
 * REAKSI EMOJI & KOMENTAR di bawah setiap berita. Berjalan di browser ('use client').
 *
 * Alurnya:
 * 1. Saat dibuka, ambil komentar + jumlah reaksi + status login dari /api/news/<slug>/interactions.
 * 2. Pengunjung bisa berkomentar sebagai: Tamu (nama bebas), akun (Masuk / Daftar), atau admin.
 * 3. Semua pengiriman dilakukan lewat API; aturan anti-spam dicek di server.
 */

import { FormEvent, useEffect, useState } from 'react'
import { COMMENT_LIMITS, REACTIONS, type InteractionsPayload, type PublicComment } from '@/lib/interactions'
import { usePrefs } from '@/components/Preferences'
import type { DictKey, Lang } from '@/lib/i18n'

// Tab form yang sedang aktif: tamu, masuk, atau daftar
type Mode = 'guest' | 'login' | 'register'

// Nama tamu terakhir disimpan di browser supaya tidak perlu diketik ulang
const GUEST_NAME_KEY = 'khincc_guest_name'

// Baca/tulis localStorage dengan aman (bisa diblokir browser, jadi dibungkus try/catch)
const readStorage = (key: string) => {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}
const writeStorage = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch {}
}

// Waktu relatif: "baru saja", "5 menit lalu", ... lebih dari 7 hari → tanggal biasa
const timeAgo = (iso: string, lang: Lang, t: (k: DictKey) => string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return t('ni.justNow')
  if (s < 3600) return `${Math.floor(s / 60)} ${t('ni.minAgo')}`
  if (s < 86400) return `${Math.floor(s / 3600)} ${t('ni.hourAgo')}`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ${t('ni.dayAgo')}`
  return new Date(iso).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Warna avatar dari nama: nama yang sama selalu mendapat warna yang sama (0–360 = derajat warna)
const avatarHue = (name: string) => Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

export default function NewsInteractions({ slug }: { slug: string }) {
  const { t, lang } = usePrefs()
  // Semua data dari server (komentar, reaksi, akun). null = masih memuat
  const [data, setData] = useState<InteractionsPayload | null>(null)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState<Mode>('guest')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [honeypot, setHoneypot] = useState('') // kolom jebakan bot, selalu kosong untuk manusia
  const [asAdmin, setAsAdmin] = useState(true) // admin membalas sebagai "Penulis"
  const [account, setAccount] = useState({ username: '', password: '', display_name: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Alamat dasar API untuk berita ini
  const api = `/api/news/${encodeURIComponent(slug)}`

  // Muat data saat komponen pertama kali tampil
  useEffect(() => {
    setName(readStorage(GUEST_NAME_KEY))
    fetch(`${api}/interactions`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || t('ni.loadFailed'))
        setData(d)
      })
      .catch((e) => setLoadError(e.message))
  }, [api])

  const react = async (emoji: string) => {
    if (!data) return
    const wasActive = data.mine.includes(emoji)
    // "Optimistic update": tampilan langsung diubah supaya terasa cepat,
    // lalu disesuaikan dengan jumlah asli dari server. Kalau gagal, dikembalikan seperti semula
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

  // Kirim komentar baru, lalu tambahkan ke daftar tanpa memuat ulang halaman
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
      if (!res.ok) throw new Error(r.error || t('ni.sendFailed'))
      if (r.comment) setData((d) => d && { ...d, comments: [...d.comments, r.comment] })
      if (!data?.user) writeStorage(GUEST_NAME_KEY, name)
      setBody('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Kirim form Masuk atau Daftar (tergantung tab yang aktif)
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
      if (!res.ok) throw new Error(r.error || t('ni.loginFailed'))
      setAccount({ username: '', password: '', display_name: '' })
      setMode('guest')
      // Muat ulang data supaya tombol hapus & reaksi sesuai akun yang baru login
      const fresh = await fetch(`${api}/interactions`).then((x) => x.json())
      setData(fresh)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Keluar dari akun, lalu muat ulang data
  const logout = async () => {
    await fetch('/api/account', { method: 'DELETE' })
    const fresh = await fetch(`${api}/interactions`).then((x) => x.json())
    setData(fresh)
  }

  // Hapus komentar (setelah konfirmasi)
  const remove = async (comment: PublicComment) => {
    if (!confirm(t('ni.confirmDelete'))) return
    const res = await fetch(`${api}/comments?id=${comment.id}`, { method: 'DELETE' })
    if (res.ok) setData((d) => d && { ...d, comments: d.comments.filter((c) => c.id !== comment.id) })
    else alert((await res.json()).error || t('ni.deleteFailed'))
  }

  // Kalau fitur komentar tidak aktif / gagal dimuat, bagian ini tidak ditampilkan sama sekali
  if (loadError) return null

  // Tab Tamu/Masuk/Daftar disembunyikan kalau sudah login, atau admin membalas sebagai Penulis
  const showAccountTabs = !data?.user && !(data?.isAdmin && asAdmin)
  const totalReactions = data ? Object.values(data.reactions).reduce((a, b) => a + b, 0) : 0

  return (
    <section className="ni" id="komentar" aria-label={t('ni.comments')}>
      {/* ===== BARIS TOMBOL REAKSI EMOJI ===== */}
      <div className="ni-reactions">
        <p className="eyebrow">{t('ni.prompt')} {totalReactions > 0 && <span>· {totalReactions} {t('ni.reactions')}</span>}</p>
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
                aria-label={`${t('ni.react')} ${emoji}`}
              >
                <span>{emoji}</span>
                {!!data?.reactions[emoji] && <b>{data.reactions[emoji]}</b>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ni-head">
        <h2>{t('ni.comments')} {data && <span>{data.comments.length}</span>}</h2>
      </div>

      {/* ===== FORM KOMENTAR / LOGIN / DAFTAR ===== */}
      <div className="ni-form">
        {/* Info identitas: "Berkomentar sebagai ..." atau pilihan admin sebagai Penulis */}
        {(data?.user || data?.isAdmin) && (
          <div className="ni-identity">
            {data.isAdmin ? (
              <label className="ni-check">
                <input type="checkbox" checked={asAdmin} onChange={(e) => setAsAdmin(e.target.checked)} />
                {t('ni.asAuthor')} <strong>{t('ni.author')}</strong>
                {asAdmin && <small>{t('ni.asAuthorHint')}</small>}
              </label>
            ) : null}
            {data.user && (!data.isAdmin || !asAdmin) && (
              <span>{t('ni.commentingAs')} <strong>{data.user.display_name}</strong> <em>@{data.user.username}</em></span>
            )}
            {data.user && <button type="button" onClick={logout}>{t('ni.logout')}</button>}
          </div>
        )}
        {showAccountTabs && (
          <div className="ni-tabs" role="tablist">
            {([['guest', t('ni.tabGuest')], ['login', t('ni.tabLogin')], ['register', t('ni.tabRegister')]] as [Mode, string][]).map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-active' : ''} onClick={() => { setMode(m); setError('') }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Masuk/Daftar → form akun; selain itu → form komentar */}
        {mode !== 'guest' && showAccountTabs ? (
          <form onSubmit={submitAccount} className="ni-fields">
            <label>{t('ni.username')}
              <input value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} autoComplete="username" placeholder={t('ni.usernamePh')} required />
            </label>
            {mode === 'register' && (
              <label>{t('ni.displayName')} <small>{t('ni.displayNameHint')}</small>
                <input value={account.display_name} onChange={(e) => setAccount({ ...account, display_name: e.target.value })} maxLength={COMMENT_LIMITS.nameMax} placeholder={t('ni.displayNamePh')} />
              </label>
            )}
            <label>{t('ni.password')}
              <input type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} required />
            </label>
            {mode === 'register' && <p className="ni-note">{t('ni.registerNote')}</p>}
            {error && <p className="ni-error">{error}</p>}
            <button type="submit" className="ni-submit" disabled={busy}>{busy ? t('ni.processing') : mode === 'register' ? t('ni.registerBtn') : t('ni.loginBtn')}</button>
          </form>
        ) : (
          <form onSubmit={submitComment} className="ni-fields">
            {!data?.user && !(data?.isAdmin && asAdmin) && (
              <label>{t('ni.name')} <small>{t('ni.nameHint')}</small>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={COMMENT_LIMITS.nameMax} placeholder={t('ni.namePh')} required />
              </label>
            )}
            <label>{t('ni.comment')}
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={COMMENT_LIMITS.bodyMax} rows={4} placeholder={t('ni.commentPh')} required />
            </label>
            {/* Jebakan bot: tersembunyi dari manusia dan pembaca layar. Bot biasanya mengisi semua kolom */}
            <input className="ni-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
            {error && <p className="ni-error">{error}</p>}
            <div className="ni-actions">
              <span>{body.length}/{COMMENT_LIMITS.bodyMax}</span>
              <button type="submit" className="ni-submit" disabled={busy || !data}>{busy ? t('ni.sending') : t('ni.send')}</button>
            </div>
          </form>
        )}
      </div>

      {/* ===== DAFTAR KOMENTAR (terlama di atas) ===== */}
      <div className="ni-list">
        {!data ? (
          <p className="ni-empty">{t('ni.loading')}</p>
        ) : data.comments.length === 0 ? (
          <p className="ni-empty">{t('ni.empty')}</p>
        ) : (
          data.comments.map((c) => (
            <article key={c.id} className={`ni-comment ${c.author_type === 'admin' ? 'is-admin' : ''}`}>
              <div className="ni-avatar" style={c.author_type === 'admin' ? undefined : { background: `hsl(${avatarHue(c.author_name)} 45% 42%)` }}>
                {c.author_name.charAt(0).toUpperCase()}
              </div>
              <div className="ni-comment-body">
                <div className="ni-comment-meta">
                  <strong>{c.author_name}</strong>
                  <span className={`ni-badge is-${c.author_type}`}>{c.author_type === 'member' ? '✓ ' : ''}{t(`ni.badge.${c.author_type}`)}</span>
                  <time dateTime={c.created_at}>{timeAgo(c.created_at, lang, t)}</time>
                  {c.can_delete && <button type="button" onClick={() => remove(c)}>{t('ni.delete')}</button>}
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
