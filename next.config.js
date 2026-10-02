/**
 * next.config.js
 * Pengaturan Next.js untuk seluruh website.
 */
/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [
      { source: '/sw.js', headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ] },
      { source: '/api/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/studio', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ]
  },
  serverExternalPackages: ['sanitize-html'],
  // Pengalihan alamat otomatis
  async redirects() {
    return [
      // Alamat lama /admin.php diarahkan ke halaman admin
      { source: '/admin.php', destination: '/admin', permanent: false },
      // www.khincreator.com dialihkan ke khincreator.com, supaya Google hanya mengenal satu alamat
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.khincreator.com' }],
        destination: 'https://khincreator.com/:path*',
        permanent: true, // pengalihan permanen (kode 308), baik untuk SEO
      },
    ]
  },
}
