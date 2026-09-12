// Service worker for PWA installability (story 1.7) plus Web Push delivery
// (story 8, AD-4): install/activate lifecycle, a plain network-passthrough
// fetch handler, and the push/notificationclick handlers below. No caching
// strategy beyond that passthrough.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// On receiving a push, both show an OS notification AND broadcast to every
// open client of this origin so an open tab re-fetches GET /api/trip/[slug]
// and re-renders from that response — never from this payload directly
// (AD-4). The payload carries only title/body/tripSlug, never state, so a
// dropped/offline push can't leave a client stale once it reconnects and
// re-fetches.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'MoapMoap';
  const body = payload.body || '';
  const tripSlug = payload.tripSlug;

  event.waitUntil(
    (async () => {
      // showNotification() can reject (e.g. permission revoked between grant
      // and delivery); guarded so the broadcast below still runs either way
      // — a guest with an open tab should still get the re-fetch even if the
      // OS notification itself couldn't be shown.
      try {
        await self.registration.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { tripSlug },
        });
      } catch (err) {
        console.error('push: showNotification failed', err);
      }

      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'trip-updated', tripSlug });
      }
    })(),
  );
});

// Focuses an existing client already on the trip's page, else opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tripSlug = event.notification.data && event.notification.data.tripSlug;
  const targetPath = tripSlug ? `/${tripSlug}` : '/';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        const clientPath = new URL(client.url).pathname;
        if (!tripSlug || clientPath === targetPath || clientPath.startsWith(`${targetPath}/`)) {
          // focus() can reject (e.g. the client closed mid-flight) — fall
          // through to the next candidate instead of silently doing nothing.
          try {
            await client.focus();
            return;
          } catch (err) {
            console.error('notificationclick: focus failed', err);
          }
        }
      }
      await self.clients.openWindow(targetPath);
    })(),
  );
});
