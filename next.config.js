/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // sanitize-html depends on ESM-only htmlparser2; load it natively instead of bundling
    serverComponentsExternalPackages: ['sanitize-html'],
  },
  async redirects() {
    return [{ source: '/admin.php', destination: '/admin', permanent: false }]
  },
}
