/* ─────────────────────────────────────────────
   TwoGether Service Worker  ·  sw.js
   Handles: push events, notification clicks,
            basic offline caching.
───────────────────────────────────────────── */

const CACHE_NAME = 'twogether-v9';
const OFFLINE_SHELL = ['/', '/manifest.json', '/pwa-192.png', '/pwa-512.png', '/favicon.png'];

// ── Install: pre-cache the app shell ─────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: purge stale caches immediately ──
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

// ── Fetch: network-first, always fetch fresh HTML ───
self.addEventListener('fetch', (event) => {
  // Don't intercept API requests or non-GET
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  // HTML navigation should ALWAYS be network-first so new app versions load immediately
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: show rich notification ───────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'TwoGether', body: event.data?.text() || '' };
  }

  const title = data.title || 'TwoGether';
  const notifType = data.data?.type || 'general';

  // Dynamic sound & vibration patterns based on urgency
  let defaultVibrate = [100, 50, 100];
  if (notifType === 'sos') {
    defaultVibrate = [400, 100, 400, 100, 800, 100, 800, 100, 1200];
  } else if (notifType === 'hype') {
    defaultVibrate = [120, 60, 200, 60, 300, 100, 400];
  } else if (notifType === 'nudge') {
    defaultVibrate = [200, 100, 200, 100, 200];
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/favicon.png',
    image: data.image || undefined,
    vibrate: data.vibrate || defaultVibrate,
    requireInteraction: !!data.requireInteraction || notifType === 'sos',
    tag: data.tag || `twogether-${notifType}-${Date.now()}`,
    renotify: true,
    data: {
      url: data.data?.url || (notifType === 'nudge' || notifType === 'sos' ? '/tasks' : '/dashboard'),
      type: notifType,
      nudgeId: data.data?.nudgeId || null,
      duration: data.data?.duration || null,
      fromUsername: data.data?.senderUsername || data.data?.fromUsername || '',
      message: data.body || '',
      timestamp: data.timestamp || Date.now(),
    },
    actions: data.actions && data.actions.length > 0 ? data.actions : [
      { action: 'open', title: '👀 Open Duo' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  if (!options.image) delete options.image;

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  let targetUrl = '/dashboard';

  if (notifData.type === 'image-nudge' && notifData.nudgeId) {
    const durParam = notifData.duration ? `&d=${notifData.duration}` : '';
    targetUrl = `/?nudge=${notifData.nudgeId}${durParam}`;
  } else if (event.action === 'tasks' || notifData.type === 'nudge') {
    targetUrl = `/tasks?action=nudge&from=${encodeURIComponent(notifData.fromUsername || '')}`;
  } else if (event.action === 'save-streak' || notifData.type === 'sos') {
    targetUrl = `/tasks?action=sos&from=${encodeURIComponent(notifData.fromUsername || '')}`;
  } else if (event.action === 'hype-back' || notifData.type === 'hype') {
    targetUrl = `/dashboard?action=hype&from=${encodeURIComponent(notifData.fromUsername || '')}`;
  } else if (notifData.url) {
    targetUrl = notifData.url;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window and navigate/postMessage
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'INCOMING_DUO_ALERT',
              notifType: notifData.type,
              fromUsername: notifData.fromUsername,
              message: notifData.message,
              nudgeId: notifData.nudgeId,
              duration: notifData.duration,
              action: event.action,
            });
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
