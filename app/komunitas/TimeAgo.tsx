'use client'
/**
 * app/komunitas/TimeAgo.tsx
 * Waktu relatif ("5 menit lalu"). Memakai teks dari kamus yang sama dengan komentar berita.
 */
import { usePrefs } from '@/components/Preferences'

export default function TimeAgo({ iso }: { iso: string }) {
  const { t, lang } = usePrefs()
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const text =
    s < 60 ? t('ni.justNow')
    : s < 3600 ? `${Math.floor(s / 60)} ${t('ni.minAgo')}`
    : s < 86400 ? `${Math.floor(s / 3600)} ${t('ni.hourAgo')}`
    : s < 86400 * 7 ? `${Math.floor(s / 86400)} ${t('ni.dayAgo')}`
    : new Date(iso).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  // suppressHydrationWarning: waktu di server dan di browser bisa berbeda beberapa detik
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>
}
