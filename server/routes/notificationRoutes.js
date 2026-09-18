const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const NudgeMessage = require('../models/NudgeMessage');
const { sendPushToUser } = require('../utils/pushNotify');

const router = express.Router();

// All notification routes require auth
router.use(protect);

/**
 * GET /api/notifications/vapid-key
 * Returns the public VAPID key so the client can subscribe.
 */
router.get('/vapid-key', (_req, res) => {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    'BFE70FU2LmEl4Zxktzr67Jf11qUYf4EFUgarMlutG5BsTkXC9T4o48rXCj7sLCLDdD65wHv-4C7G9H7x1DPIaVY';
  res.json({ success: true, data: { publicKey } });
});

/**
 * POST /api/notifications/subscribe
 * Body: { subscription: PushSubscription }
 */
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Subscription object is required.' });
    }
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
    );
    await User.updateOne(
      { _id: req.user._id },
      { $push: { pushSubscriptions: subscription } }
    );
    res.json({ success: true, data: { message: 'Push subscription saved.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Body: { endpoint: string }
 */
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { pushSubscriptions: { endpoint } } }
      );
    }
    res.json({ success: true, data: { message: 'Unsubscribed.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/test
 * Sends a test push notification to the requesting user.
 */
router.post('/test', async (req, res, next) => {
  try {
    const result = await sendPushToUser(req.user._id, {
      title: '🔥 TwoGether Test Notification',
      body: `Hey ${req.user.username}! Notifications are working perfectly.`,
      icon: '/favicon.svg',
      data: { type: 'test', url: '/dashboard' },
    });

    if (result.sent === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active push subscriptions found. Please enable notifications first.',
      });
    }
    res.json({ success: true, data: { message: 'Test notification sent!', ...result } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/send-image-nudge
 * Body: { imageDataUrl?, message?, emoji? }
 *
 * Stores the nudge in DB (so the image is NEVER in the push payload),
 * sends a text-only push with the nudge ID as deep-link.
 */
router.post('/send-image-nudge', async (req, res, next) => {
  try {
    const sender = await User.findById(req.user._id).select('username duoId').lean();
    if (!sender.duoId) {
      return res.status(400).json({ success: false, message: 'You are not in a duo.' });
    }

    const Duo = require('../models/Duo');
    const duo = await Duo.findById(sender.duoId).select('users').lean();
    if (!duo || !duo.users || duo.users.length < 2) {
      return res.status(400).json({ success: false, message: 'Duo partner not found.' });
    }

    const partnerId = duo.users.find((id) => id.toString() !== req.user._id.toString());
    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'Could not determine your partner.' });
    }

    const { message = '', emoji = '👋', imageDataUrl, imageSource = 'gallery' } = req.body;

    if (imageDataUrl && imageDataUrl.length > 200000) {
      return res.status(400).json({ success: false, message: 'Image is too large. Please use a smaller image.' });
    }

    const hasImage = !!imageDataUrl;
    const sourceText = imageSource === 'camera' ? 'clicked from camera' : 'chosen from gallery';

    // 1. Store the nudge in DB
    const nudge = await NudgeMessage.create({
      fromUserId: req.user._id,
      toUserId: partnerId,
      fromUsername: sender.username,
      imageDataUrl: imageDataUrl || null,
      imageSource: hasImage ? imageSource : null,
      message: message.trim(),
      emoji,
    });

    // 2. Also log to duo activity feed
    try {
      await Duo.findByIdAndUpdate(sender.duoId, {
        $push: {
          nudges: {
            sender: req.user._id,
            type: 'image',
            message: hasImage ? `Attached picture (${sourceText})` : (message.trim() || 'Nudge'),
            createdAt: new Date(),
          },
        },
      });
    } catch (duoErr) {
      console.warn('Could not record nudge in duo feed:', duoErr);
    }

    // 3. Send push notification with explicit picture attachment status
    let notifTitle = `${sender.username} nudged you! 🚀`;
    let notifBody = '';

    if (hasImage) {
      notifTitle = `📸 Photo Attached from ${sender.username}!`;
      notifBody = `✅ Picture ${sourceText} attached successfully! ${message.trim() ? `"${message.trim()}" • ` : ''}Tap to view 🔒`;
    } else {
      notifBody = `${emoji} ${message.trim() || `${sender.username} sent you a nudge!`}`;
    }

    const result = await sendPushToUser(partnerId, {
      title: notifTitle,
      body: notifBody,
      icon: '/pwa-192.png',
      badge: '/favicon.png',
      data: {
        type: 'image-nudge',
        nudgeId: nudge._id.toString(),
        fromUsername: sender.username,
        hasImage,
        imageSource,
        sourceText,
        url: `/?nudge=${nudge._id.toString()}`,
      },
      actions: [
        { action: 'open', title: hasImage ? '📸 View Attached Photo' : '👀 Open App' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    });

    if (result.sent === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your partner has not enabled notifications yet.',
      });
    }

    res.json({ success: true, data: { message: 'Nudge sent!', nudgeId: nudge._id, ...result } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/nudge/:id
 * Returns nudge data ONLY to the intended recipient.
 * Marks the nudge as viewed after first fetch.
 */
router.get('/nudge/:id', async (req, res, next) => {
  try {
    const nudge = await NudgeMessage.findById(req.params.id);

    if (!nudge) {
      return res.status(404).json({ success: false, message: 'Nudge not found or expired.' });
    }

    // Security: only the recipient can view
    if (nudge.toUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Mark as viewed
    if (!nudge.viewed) {
      nudge.viewed = true;
      await nudge.save();
    }

    res.json({
      success: true,
      data: {
        fromUsername: nudge.fromUsername,
        imageDataUrl: nudge.imageDataUrl,
        message: nudge.message,
        emoji: nudge.emoji,
        createdAt: nudge.createdAt,
        viewed: nudge.viewed,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
