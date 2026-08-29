// Minimal service worker for PWA installability (story 1.7).
//
// Scope is intentionally narrow: install/activate lifecycle plus a plain
// network-passthrough fetch handler. No caching strategy, no push handling
// — push/notificationclick/postMessage broadcast is story 1.8's scope
// (see AD-4 in the architecture spine). Story 1.8 extends this same file.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
