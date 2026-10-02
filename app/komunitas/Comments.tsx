'use client'
/**
 * app/komunitas/Comments.tsx
 * Komentar bersarang ala Reddit: tulis komentar, balas komentar, vote, hapus, laporkan.
 * Daftar awal datang dari server; komentar baru ditambahkan langsung tanpa memuat ulang halaman.
 */
import { FormEvent, useMemo, useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import { COMMUNITY_LIMITS as L, type PublicCommunityComment } from '@/lib/community'
import Vote from './Vote'
import PostActions from './PostActions'
import TimeAgo from './TimeAgo'

const MAX_INDENT = 5 // lebih dalam dari ini, balasan tidak menjorok lagi (supaya tidak sempit di HP)

function CommentForm({ postId, parentId, autoFocus, onDone, onCancel }: {
  postId: number
  parentId: number | null
  autoFocus?: boolean
  onDone: (c: PublicCommunityComment) => void
  onCancel?: () => void
}) {
  const { t } = usePrefs()
  const [body, setBody] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, parent_id: parentId, body, website: honeypot }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || t('ni.sendFailed'))
      if (r.comment) onDone(r.comment)
      setBody('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="cm-reply-form ni-fields">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={L.commentMax} rows={parentId ? 3 : 4} placeholder={t('cm.commentPh')} autoFocus={autoFocus} required />
      <input className="ni-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
      {error && <p className="ni-error">{error}</p>}
      <div className="ni-actions">
        <span>{body.length}/{L.commentMax}</span>
        <span className="cm-row">
          {onCancel && <button type="button" className="cm-ghost" onClick={onCancel}>{t('cm.cancel')}</button>}
          <button type="submit" className="ni-submit" disabled={busy}>{busy ? t('ni.sending') : parentId ? t('cm.reply') : t('cm.commentBtn')}</button>
        </span>
      </div>
    </form>
  )
}

export default function Comments({ postId, initial, loggedIn }: { postId: number; initial: PublicCommunityComment[]; loggedIn: boolean }) {
  const { t } = usePrefs()
  const [items, setItems] = useState(initial)
  const [replyTo, setReplyTo] = useState<number | null>(null)

  // Kelompokkan komentar menurut induknya: parent_id → daftar balasan
  const children = useMemo(() => {
    const map = new Map<number | null, PublicCommunityComment[]>()
    for (const c of items) map.set(c.parent_id, [...(map.get(c.parent_id) || []), c])
    return map
  }, [items])

  // Hapus komentar beserta semua balasannya dari tampilan (server menghapusnya juga)
  const dropLocal = (id: number) => {
    const doomed = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const c of items) if (c.parent_id && doomed.has(c.parent_id) && !doomed.has(c.id)) { doomed.add(c.id); grew = true }
    }
    setItems((list) => list.filter((c) => !doomed.has(c.id)))
  }

  const render = (c: PublicCommunityComment, depth: number) => (
    <li key={c.id} className="cm-comment">
      <div className="cm-comment-head">
        <strong>{c.author.display_name}</strong> <em>@{c.author.username}</em> · <TimeAgo iso={c.created_at} />
      </div>
      <p className="cm-body">{c.body}</p>
      <div className="cm-comment-foot">
        <Vote type="comment" id={c.id} score={c.score} myVote={c.my_vote} loggedIn={loggedIn} />
        {loggedIn && <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>{t('cm.reply')}</button>}
        <PostActions type="comment" id={c.id} canDelete={c.can_delete} loggedIn={loggedIn} onDeleted={() => dropLocal(c.id)} />
      </div>
      {replyTo === c.id && (
        <CommentForm postId={postId} parentId={c.id} autoFocus onCancel={() => setReplyTo(null)} onDone={(n) => { setItems((l) => [...l, n]); setReplyTo(null) }} />
      )}
      {!!children.get(c.id)?.length && (
        <ul className={depth < MAX_INDENT ? 'cm-thread' : 'cm-thread is-flat'}>{children.get(c.id)!.map((k) => render(k, depth + 1))}</ul>
      )}
    </li>
  )

  const roots = children.get(null) || []
  return (
    <section className="cm-comments" aria-label={t('ni.comments')}>
      <h2>{t('ni.comments')} <span>{items.length}</span></h2>
      {loggedIn && <CommentForm postId={postId} parentId={null} onDone={(n) => setItems((l) => [...l, n])} />}
      {roots.length === 0 ? <p className="ni-empty">{t('cm.noComments')}</p> : <ul className="cm-thread cm-root">{roots.map((c) => render(c, 0))}</ul>}
    </section>
  )
}
