/**
 * next.config.js
 * Pengaturan Next.js untuk seluruh website.
 */
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // sanitize-html memakai htmlparser2 yang formatnya khusus (ESM saja).
    // Supaya tidak error di Vercel, paket ini dimuat langsung oleh Node.js, tidak digabung ke bundle
    serverComponentsExternalPackages: ['sanitize-html'],
  },
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
