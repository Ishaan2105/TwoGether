const webpush = require('web-push');
const User = require('../models/User');

// Initialise VAPID credentials once on module load
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@duohabit.app';
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BFE70FU2LmEl4Zxktzr67Jf11qUYf4EFUgarMlutG5BsTkXC9T4o48rXCj7sLCLDdD65wHv-4C7G9H7x1DPIaVY';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'rcX3aiDNEAbD8DnH5GUu84y-Lf8hqWKjKnep3ZHXCWQ';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Send a push notification to a specific user.
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, icon?: string, image?: string, data?: object }} payload
 */
async function sendPushToUser(userId, payload) {
  const user = await User.findById(userId).select('pushSubscriptions username').lean();
  if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const notification = JSON.stringify({
    title: payload.title || 'TwoGether',
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    image: payload.image || null,
    data: payload.data || {},
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  for (const sub of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(sub, notification);
      sent++;
    } catch (err) {
      // 410 Gone = subscription expired / revoked — clean up
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredEndpoints.push(sub.endpoint);
      }
      failed++;
    }
  }

  // Remove expired subscriptions from DB
  if (expiredEndpoints.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } } }
    );
  }

  return { sent, failed };
}

module.exports = { webpush, sendPushToUser };
