'use client'
/**
 * app/komunitas/PostActions.tsx
 * Tombol Hapus (pemilik / admin) dan Laporkan (anggota login) untuk kiriman atau komentar.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrefs } from '@/components/Preferences'
import type { VoteTarget } from '@/lib/community'

export default function PostActions({ type, id, canDelete, loggedIn, redirectTo, onDeleted }: {
  type: VoteTarget
  id: number
  canDelete: boolean
  loggedIn: boolean
  redirectTo?: string // setelah kiriman dihapus, pindah ke halaman ini
  onDeleted?: () => void
}) {
  const { t } = usePrefs()
  const router = useRouter()
  const [reported, setReported] = useState(false)

  const remove = async () => {
    if (!confirm(t('cm.confirmDelete'))) return
    const res = await fetch(`/api/community/${type === 'post' ? 'posts' : 'comments'}?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || t('ni.deleteFailed'))
    if (onDeleted) onDeleted()
    if (redirectTo) router.push(redirectTo)
    router.refresh()
  }

  const report = async () => {
    const reason = prompt(t('cm.reportPrompt'))
    if (reason === null) return
    const res = await fetch('/api/community/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, reason }),
    })
    if (res.ok) setReported(true)
    else alert((await res.json().catch(() => ({}))).error || t('ni.sendFailed'))
  }

  return (
    <span className="cm-actions">
      {loggedIn && !canDelete && (reported ? <em>{t('cm.reported')}</em> : <button type="button" onClick={report}>{t('cm.report')}</button>)}
      {canDelete && <button type="button" className="is-danger" onClick={remove}>{t('cm.delete')}</button>}
    </span>
  )
}
