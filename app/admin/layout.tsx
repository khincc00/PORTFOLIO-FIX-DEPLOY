import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

// The admin UI is designed light-only; keep native inputs light even in site night mode
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>
}
