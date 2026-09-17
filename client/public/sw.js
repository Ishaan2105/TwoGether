/* ─────────────────────────────────────────────
   TwoGether Service Worker  ·  sw.js
   Handles: push events, notification clicks,
            basic offline caching.
───────────────────────────────────────────── */

const CACHE_NAME = 'twogether-v1';
const OFFLINE_SHELL = ['/'];

// ── Install: pre-cache the app shell ─────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: purge stale caches ──────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with offline cache ───
self.addEventListener('fetch', (event) => {
  // Don't intercept API requests or non-GET
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: show notification ───────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'TwoGether', body: event.data?.text() || '' };
  }

  const title = data.title || 'TwoGether';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/favicon.png',
    image: data.image || undefined,
    vibrate: [100, 50, 100],
    tag: data.data?.type || 'twogether-notification',
    renotify: true,
    data: {
      url: data.data?.url || '/',
      type: data.data?.type || 'general',
      fromUsername: data.data?.fromUsername || '',
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      { action: 'open', title: '👀 Open App' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  // Remove undefined fields so Chrome doesn't complain
  if (!options.image) delete options.image;

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  let targetUrl = '/dashboard';

  // For image-nudge: deep-link directly to the nudge viewer
  if (notifData.type === 'image-nudge' && notifData.nudgeId) {
    targetUrl = `/?nudge=${notifData.nudgeId}`;
  } else if (notifData.url) {
    targetUrl = notifData.url;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (client.navigate) client.navigate(targetUrl);
            return;
          }
        }
        // Open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
