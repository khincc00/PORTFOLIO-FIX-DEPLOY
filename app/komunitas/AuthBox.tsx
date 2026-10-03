'use client'
/**
 * app/komunitas/AuthBox.tsx
 * Kotak masuk / daftar akun anggota (akun yang sama dengan komentar berita).
 * Kalau sudah login, hanya menampilkan nama dan tombol keluar.
 */
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrefs } from '@/components/Preferences'

type Mode = 'login' | 'register'

export default function AuthBox({ user, asAdmin = false }: { user: { display_name: string; username: string } | null; asAdmin?: boolean }) {
  const { t } = usePrefs()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState({ username: '', password: '', display_name: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/account/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || t('ni.loginFailed'))
      setForm({ username: '', password: '', display_name: '' })
      router.refresh() // muat ulang data halaman sebagai pengguna yang baru login
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/account', { method: 'DELETE' })
    router.refresh()
  }

  if (user && asAdmin) {
    return (
      <div className="cm-identity">
        <span>{t('ni.commentingAs')} <strong>{user.display_name}</strong> <b className="cm-admin">Admin</b></span>
      </div>
    )
  }

  if (user) {
    return (
      <div className="cm-identity">
        <span>{t('ni.commentingAs')} <strong>{user.display_name}</strong> <em>@{user.username}</em></span>
        <button type="button" onClick={logout}>{t('ni.logout')}</button>
      </div>
    )
  }

  return (
    <div className="cm-auth ni-form">
      <p className="ni-note">{t('cm.loginPrompt')}</p>
      <div className="ni-tabs" role="tablist">
        {(['login', 'register'] as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-active' : ''} onClick={() => { setMode(m); setError('') }}>
            {m === 'login' ? t('ni.tabLogin') : t('ni.tabRegister')}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="ni-fields">
        <label>{t('ni.username')}
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" placeholder={t('ni.usernamePh')} required />
        </label>
        {mode === 'register' && (
          <label>{t('ni.displayName')} <small>{t('ni.displayNameHint')}</small>
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={40} placeholder={t('ni.displayNamePh')} />
          </label>
        )}
        <label>{t('ni.password')}
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} required />
        </label>
        {mode === 'register' && <p className="ni-note">{t('ni.registerNote')}</p>}
        {error && <p className="ni-error">{error}</p>}
        <button type="submit" className="ni-submit" disabled={busy}>{busy ? t('ni.processing') : mode === 'register' ? t('ni.registerBtn') : t('ni.loginBtn')}</button>
      </form>
    </div>
  )
}
