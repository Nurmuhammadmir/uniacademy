// Minimal service worker - exists only so the browser considers this app installable (Add to
// Home Screen / native install prompt). Deliberately does NOT cache anything: homework, exams and
// progress change constantly, so serving a stale cached response would be worse than no offline
// support at all. Every request just passes straight through to the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)))
