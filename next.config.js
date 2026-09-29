/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // sanitize-html depends on ESM-only htmlparser2; load it natively instead of bundling
    serverComponentsExternalPackages: ['sanitize-html'],
  },
  async redirects() {
    return [
      { source: '/admin.php', destination: '/admin', permanent: false },
      // Keep one canonical host for Google
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.khincreator.com' }],
        destination: 'https://khincreator.com/:path*',
        permanent: true,
      },
    ]
  },
}
