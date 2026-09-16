const webpush = require('web-push');
const User = require('../models/User');

// Initialise VAPID credentials once on module load
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@twogether.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
