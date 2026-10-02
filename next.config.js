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
  // sanitize-html memakai htmlparser2 v12 yang formatnya ESM saja. Kalau dimuat langsung oleh Node di server,
  // hasilnya error 500 di Node < 22.12 (dulu terjadi di Vercel). Karena itu paket ini SENGAJA ikut digabung
  // (di-bundle) ke hasil build, bukan dimuat terpisah, sehingga tidak bergantung pada versi Node.
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
