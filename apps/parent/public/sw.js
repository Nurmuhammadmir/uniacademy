// Minimal service worker - exists so the browser considers this app installable (Add to Home
// Screen / native install prompt) AND so it can receive Web Push events even while the app itself
// isn't open. Deliberately does NOT cache anything: attendance/progress/payment data changes
// constantly, so serving a stale cached response would be worse than no offline support at all.
// Every request just passes straight through to the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)))

// the payload is always JSON (see server/services/pushNotification.service.js) - shows the
// notification even if no tab is open, which is the entire point of push over an in-app toast
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'UniAcademy'
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: data.tag,
        })
    )
})

// focuses an already-open tab instead of always opening a new one
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) return client.focus()
            }
            if (self.clients.openWindow) return self.clients.openWindow('/')
        })
    )
})