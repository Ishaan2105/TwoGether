import api from './api.js';

/** Returns the VAPID public key from the server */
export async function getVapidKey() {
  const { data } = await api.get('/notifications/vapid-key');
  return data.data.publicKey;
}

/**
 * Registers the service worker and creates a PushSubscription,
 * then POSTs it to the backend.
 */
export async function subscribeToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // Register SW if not already registered
  const existingReg = await navigator.serviceWorker.getRegistration('/');
  if (!existingReg) {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }
  // Wait until the SW is active and ready
  const reg = await navigator.serviceWorker.ready;

  const publicKey = await getVapidKey();
  if (!publicKey) {
    throw new Error('VAPID public key not found on server.');
  }

  // Convert base64 VAPID key → Uint8Array
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  // If there's an existing subscription with a different key, remove it first
  const existingSub = await reg.pushManager.getSubscription();
  if (existingSub) {
    try {
      // Check if the existing subscription uses the same key
      const existingKey = existingSub.options?.applicationServerKey;
      const newKeyBytes = applicationServerKey;
      let keysMatch = false;
      if (existingKey) {
        const existingBytes = new Uint8Array(existingKey);
        keysMatch = existingBytes.length === newKeyBytes.length &&
          existingBytes.every((b, i) => b === newKeyBytes[i]);
      }
      if (!keysMatch) {
        // Unsubscribe stale subscription before re-subscribing with new key
        await existingSub.unsubscribe();
      } else {
        // Already subscribed with correct key — just re-save to backend
        await api.post('/notifications/subscribe', { subscription: existingSub });
        return existingSub;
      }
    } catch {
      // If checking fails, force unsubscribe and re-subscribe
      try { await existingSub.unsubscribe(); } catch { /* ignore */ }
    }
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // Save to backend
  await api.post('/notifications/subscribe', { subscription });
  return subscription;
}

/** Unsubscribe from push & remove from backend */
export async function unsubscribeFromWebPush() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
}

/** Check if the user is already subscribed */
export async function checkSubscriptionStatus() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Request the browser notification permission */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
}

/** Trigger a real test push notification from the server */
export async function sendTestNotification() {
  const { data } = await api.post('/notifications/test');
  return data;
}

/** Send an image nudge to the current user's duo partner */
export async function sendImageNudge({ imageDataUrl = null, message = '', emoji = '👋', imageSource = 'gallery', duration = 15 }) {
  const { data } = await api.post('/notifications/send-image-nudge', {
    imageDataUrl,
    message,
    emoji,
    imageSource,
    duration,
  });
  return data;
}

/** Fetch a nudge message by ID (only works for the intended recipient) */
export async function getNudgeMessage(nudgeId) {
  const { data } = await api.get(`/notifications/nudge/${nudgeId}`);
  return data.data;
}

// ── Helpers ─────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
