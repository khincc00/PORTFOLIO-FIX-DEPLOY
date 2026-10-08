/**
 * lib/notify-email.ts
 * Mengirim notifikasi email ke admin setiap ada pesan kontak masuk lewat Resend.
 * Kalau env belum diatur, fungsi ini diam-diam dilewati.
 */

export interface ContactNotification {
  name: string
  email: string
  project_type: string
  budget: string
  message: string
}

export async function sendContactNotification(c: ContactNotification) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_NOTIFY_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL
  if (!key || !to || !from) return // belum diatur, lewati saja

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: c.email,
      subject: `Pesan baru: ${c.project_type} dari ${c.name}`,
      text: `Nama: ${c.name}\nEmail: ${c.email}\nProyek: ${c.project_type}\nBudget: ${c.budget}\n\n${c.message}`,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`)
  }
}
