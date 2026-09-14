// Minimal service worker — exists only to satisfy browsers' PWA
// installability requirement (Chrome/Android/desktop won't fire
// beforeinstallprompt without one). Deliberately does NOT cache API
// responses or aggressively cache the app shell, since this app's data
// changes constantly and stale reads would be worse than no offline
// support at all. Network-first everywhere; the cached shell is only a
// last resort when there is truly no connection.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
