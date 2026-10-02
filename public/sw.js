/* Network-only for ALL app/admin/API requests. Never cache private content.
   The sole cached document is a static, content-free offline explanation. */
const CACHE = 'khincc-offline-v1'
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('khincc-offline-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
})
