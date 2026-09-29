/**
 * app/admin/layout.tsx → kerangka khusus halaman /admin.
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false }, // jangan tampilkan halaman admin di Google
}

// Tampilan admin hanya dirancang untuk mode terang. Class .admin-root (di globals.css)
// menjaga form tetap terang walaupun website sedang dalam mode malam
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>
}
