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
  // Halaman /games adalah HTML statis (public/games/index.html). Alamat /games ditampilkan dari file itu
  // Subdomain audiohub.khincreator.com juga HTML statis (public/audiohub/index.html). Ditaruh di beforeFiles
  // supaya menang melawan app/page.tsx pada alamat "/" di host tersebut
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', has: [{ type: 'host', value: 'audiohub.khincreator.com' }], destination: '/audiohub/index.html' },
      ],
      afterFiles: [{ source: '/games', destination: '/games/index.html' }],
    }
  },
  // Pengalihan alamat otomatis
  async redirects() {
    return [
      // Alamat lama /admin.php diarahkan ke halaman admin
      { source: '/admin.php', destination: '/admin', permanent: false },
      // Folder lama (salah eja) /adiohub/... diarahkan ke /audiohub/..., supaya tautan gambar lama tetap jalan
      { source: '/adiohub/:path*', destination: '/audiohub/:path*', permanent: true },
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
