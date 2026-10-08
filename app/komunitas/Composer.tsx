'use client'
/**
 * app/komunitas/Composer.tsx
 * Form membuat kiriman baru: judul, teks, dan sampai 4 gambar.
 * Gambar diunggah satu per satu ke /api/community/upload, lalu alamatnya dikirim bersama kiriman.
 */
import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrefs } from '@/components/Preferences'
import { COMMUNITY_LIMITS as L } from '@/lib/community'

export default function Composer() {
  const { t } = usePrefs()
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [honeypot, setHoneypot] = useState('') // jebakan bot, selalu kosong untuk manusia
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
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
        const r = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(r.error || t('ni.sendFailed'))
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
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, images, website: honeypot }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || t('ni.sendFailed'))
      if (r.id) router.push(`/komunitas/${r.id}`)
      else router.refresh()
    } catch (e: any) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="cm-composer ni-form ni-fields">
      <h3>{t('cm.newPost')}</h3>
      <label>{t('cm.postTitle')}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={L.titleMax} placeholder={t('cm.postTitlePh')} required />
      </label>
      <label>{t('cm.postBody')}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={L.bodyMax} rows={5} placeholder={t('cm.postBodyPh')} />
      </label>
      <input className="ni-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />

      {images.length > 0 && (
        <div className="cm-thumbs">
          {images.map((src) => (
            <div key={src} className="cm-thumb">
              <img src={src} alt="" referrerPolicy="no-referrer" />
              <button type="button" aria-label={t('cm.removeImage')} title={t('cm.removeImage')} onClick={() => setImages(images.filter((i) => i !== src))}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="cm-attach">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button type="button" className="cm-ghost" disabled={uploading || images.length >= L.maxImages} onClick={() => fileInput.current?.click()}>
          {uploading ? t('cm.uploading') : `＋ ${t('cm.addImage')}`}
        </button>
        <small>{t('cm.imagesHint', { max: L.maxImages })}</small>
      </div>

      {error && <p className="ni-error">{error}</p>}
      <div className="ni-actions">
        <span>{title.length}/{L.titleMax}</span>
        <button type="submit" className="ni-submit" disabled={busy || uploading}>{busy ? t('cm.publishing') : t('cm.publish')}</button>
      </div>
    </form>
  )
}
