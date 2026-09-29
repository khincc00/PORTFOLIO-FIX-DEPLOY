/**
 * lib/sanitize.ts
 * Membersihkan HTML isi berita sebelum disimpan.
 *
 * Isi berita dari editor admin berupa HTML. Supaya tidak ada kode berbahaya
 * (misalnya <script> yang mencuri data pengunjung), hanya tag dan atribut
 * yang ada di daftar di bawah ini yang dipertahankan. Sisanya dibuang.
 */
import sanitizeHtml from 'sanitize-html'

export function sanitizeNewsHtml(html: string) {
  return sanitizeHtml(html, {
    // Tag HTML yang boleh dipakai di isi berita
    allowedTags: [
      'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'hr', 'pre', 'code',
    ],
    // Atribut yang boleh dipakai di masing-masing tag
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    // Jenis link yang diizinkan (javascript: otomatis ditolak)
    allowedSchemes: ['http', 'https', 'mailto'],
    // Semua link dibuka di tab baru dan tidak memberi akses ke halaman ini
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  })
}
