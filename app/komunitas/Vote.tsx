'use client'
/**
 * app/komunitas/Vote.tsx
 * Tombol ▲ skor ▼ untuk kiriman dan komentar. Tampilan langsung berubah (optimistic),
 * lalu disesuaikan dengan skor asli dari server.
 */
import { useState } from 'react'
import { usePrefs } from '@/components/Preferences'
import type { VoteTarget, VoteValue } from '@/lib/community'

export default function Vote({ type, id, score, myVote, loggedIn }: { type: VoteTarget; id: number; score: number; myVote: VoteValue; loggedIn: boolean }) {
  const { t } = usePrefs()
  const [state, setState] = useState({ score, mine: myVote })
  const [busy, setBusy] = useState(false)

  const cast = async (direction: 1 | -1) => {
    if (!loggedIn) return alert(t('cm.loginToVote'))
    if (busy) return
    const next: VoteValue = state.mine === direction ? 0 : direction
    const previous = state
    setState({ score: state.score - state.mine + next, mine: next })
    setBusy(true)
    try {
      const res = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, value: next }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error)
      setState({ score: r.score, mine: next })
    } catch {
      setState(previous)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cm-vote" role="group">
      <button type="button" className={state.mine === 1 ? 'is-up' : ''} aria-pressed={state.mine === 1} aria-label={t('cm.upvote')} title={loggedIn ? t('cm.upvote') : t('cm.loginToVote')} onClick={() => cast(1)}>▲</button>
      <b>{state.score}</b>
      <button type="button" className={state.mine === -1 ? 'is-down' : ''} aria-pressed={state.mine === -1} aria-label={t('cm.downvote')} title={loggedIn ? t('cm.downvote') : t('cm.loginToVote')} onClick={() => cast(-1)}>▼</button>
    </div>
  )
}
