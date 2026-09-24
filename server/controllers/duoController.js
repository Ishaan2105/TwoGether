const Duo = require('../models/Duo');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { clusterDuoHabitsIntoShells } = require('../utils/shellMatcher');
const { sendPushToUser } = require('../utils/pushNotify');
const { sendEmergencySOSEmail } = require('../services/emailService');
const { generateUniqueDuoInviteCode } = require('../utils/generateCode');

/**
 * Lookup a partner by their Duo Invite Code to preview before pairing
 * POST /api/duo/lookup
 */
async function lookupCode(req, res, next) {
  try {
    const rawCode = req.body.code || req.query.code || '';
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a Duo invite code.',
      });
    }

    if (req.user.duoId) {
      const existingDuo = await Duo.findById(req.user.duoId);
      if (existingDuo && existingDuo.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'You are already in an active Duo. Leave your current Duo before pairing.',
        });
      }
    }

    if (req.user.duoInviteCode && req.user.duoInviteCode.toUpperCase() === code) {
      return res.status(400).json({
        success: false,
        message: 'You cannot pair with your own invite code.',
      });
    }

    const partner = await User.findOne({ duoInviteCode: code });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this Duo code. Check for typos and try again.',
      });
    }

    if (partner.duoId) {
      const partnerDuo = await Duo.findById(partner.duoId);
      if (partnerDuo && partnerDuo.status === 'active') {
        return res.status(400).json({
          success: false,
          message: `${partner.username} is already paired in an active Duo.`,
        });
      }
    }

    res.json({
      success: true,
      data: {
        partner: {
          _id: partner._id,
          username: partner.username,
          customTitle: partner.customTitle,
          personalLevel: partner.personalLevel,
          personalXP: partner.personalXP,
          soloStreak: partner.soloStreak,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Pair current user with partner using their Duo Invite Code
 * POST /api/duo/pair
 */
async function pairDuo(req, res, next) {
  try {
    const rawCode = req.body.code || '';
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Duo invite code.',
      });
    }

    if (req.user.duoId) {
      const existingDuo = await Duo.findById(req.user.duoId);
      if (existingDuo && existingDuo.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'You are already part of an active Duo.',
        });
      }
    }

    if (req.user.duoInviteCode && req.user.duoInviteCode.toUpperCase() === code) {
      return res.status(400).json({
        success: false,
        message: 'You cannot pair with yourself.',
      });
    }

    const partner = await User.findOne({ duoInviteCode: code });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this code.',
      });
    }

    if (partner.duoId) {
      const partnerDuo = await Duo.findById(partner.duoId);
      if (partnerDuo && partnerDuo.status === 'active') {
        return res.status(400).json({
          success: false,
          message: `${partner.username} is already in another Duo.`,
        });
      }
    }

    // Create the new Duo document
    const duo = await Duo.create({
      users: [req.user._id, partner._id],
      duoName: `${req.user.username} & ${partner.username}`,
      duoStreak: 0,
      highestStreak: 0,
      synergyScore: 100,
      duoXP: 0,
      duoLevel: 1,
      duoShields: 1,
      status: 'active',
      formedAt: new Date(),
    });

    // Link both users
    req.user.duoId = duo._id;
    await req.user.save();

    partner.duoId = duo._id;
    await partner.save();

    const populatedDuo = await Duo.findById(duo._id).populate(
      'users',
      '_id username customTitle personalLevel personalXP soloStreak'
    );

    const partnerObj = populatedDuo.users.find(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    // Trigger real-time Web Push notification to partner (User A) so their device and dashboard update immediately
    try {
      await sendPushToUser(partner._id, {
        title: '🎉 Duo Partner Connected!',
        body: `@${req.user.username} paired up with you! Your shared streak begins now.`,
        icon: '/pwa-192.png',
        data: {
          type: 'duo-paired',
          url: '/dashboard',
          fromUsername: req.user.username,
        },
      });
    } catch (pushErr) {
      console.warn('Pair push notification skipped:', pushErr?.message);
    }

    res.status(201).json({
      success: true,
      data: {
        duo: populatedDuo,
        partner: partnerObj,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current user's Duo status and partner info
 * GET /api/duo/me
 */
async function getMyDuo(req, res, next) {
  try {
    if (!req.user.duoId) {
      return res.json({
        success: true,
        data: {
          duo: null,
          partner: null,
        },
      });
    }

    const duo = await Duo.findById(req.user.duoId).populate(
      'users',
      '_id username customTitle personalLevel personalXP soloStreak'
    );

    if (!duo || duo.status === 'dissolved') {
      req.user.duoId = null;
      await req.user.save();
      return res.json({
        success: true,
        data: {
          duo: null,
          partner: null,
        },
      });
    }

    const partner = duo.users.find(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    res.json({
      success: true,
      data: {
        duo,
        partner: partner || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send interactive nudge/hype/SOS to partner
 * POST /api/duo/nudge
 */
async function sendNudge(req, res, next) {
  try {
    const { type, message } = req.body;
    if (!['hype', 'nudge', 'sos'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid nudge type. Must be hype, nudge, or sos.',
      });
    }

    if (!req.user.duoId) {
      return res.status(400).json({
        success: false,
        message: 'You need an active Duo to send nudges.',
      });
    }

    const duo = await Duo.findById(req.user.duoId);
    if (!duo || duo.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Active Duo not found.',
      });
    }

    duo.nudges.push({
      sender: req.user._id,
      type,
      message: message || '',
      createdAt: new Date(),
    });

    if (duo.nudges.length > 30) {
      duo.nudges = duo.nudges.slice(-30);
    }

    await duo.save();

    const populatedDuo = await Duo.findById(duo._id).populate(
      'users',
      '_id username email customTitle personalLevel personalXP soloStreak'
    );

    // Identify partner to receive the push notification
    const partner = populatedDuo.users.find(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    let emailResult = null;

    if (partner) {
      let pushTitle = '';
      let pushBody = '';
      let pushUrl = '/dashboard';
      let vibratePattern = [100, 50, 100];
      let actions = [];
      let requireInteraction = false;
      const tag = `twogether-${type}-${Date.now()}`;

      if (type === 'hype') {
        pushTitle = `⚡🔥 HYPE PULSE from @${req.user.username}!`;
        pushBody =
          message && message.trim()
            ? message.trim()
            : "You're crushing it! Keep the momentum going and lock in today's synergy! 🔥";
        pushUrl = `/dashboard?action=hype&from=${encodeURIComponent(req.user.username)}`;
        vibratePattern = [120, 60, 200, 60, 300, 100, 400];
        actions = [
          { action: 'hype-back', title: '🔥 Hype Back!' },
          { action: 'open', title: '⚡ Open Duo' },
        ];
      } else if (type === 'nudge') {
        pushTitle = `🔔 Accountability Nudge from @${req.user.username}!`;
        pushBody =
          message && message.trim()
            ? message.trim()
            : "Hey! Don't forget to complete your daily habits and synergy shells today! 🎯";
        pushUrl = `/tasks?action=nudge&from=${encodeURIComponent(req.user.username)}`;
        vibratePattern = [200, 100, 200, 100, 200];
        actions = [
          { action: 'tasks', title: '✅ Check-off Habits' },
          { action: 'open', title: '👀 View Dashboard' },
        ];
      } else if (type === 'sos') {
        pushTitle = `🚨 EMERGENCY STREAK ALERT from @${req.user.username}!`;
        pushBody =
          message && message.trim()
            ? message.trim()
            : '⚠️ CODE RED: Midnight cutoff is approaching! Our joint streak is on the line. Complete habits now to save our shield! 🛡️';
        pushUrl = `/tasks?action=sos&from=${encodeURIComponent(req.user.username)}`;
        requireInteraction = true;
        vibratePattern = [400, 100, 400, 100, 800, 100, 800, 100, 1200];
        actions = [
          { action: 'save-streak', title: '🛡️ SAVE STREAK NOW' },
          { action: 'open', title: '🚨 Open App' },
        ];

        // Send high-priority Emergency SOS email to partner
        if (partner.email) {
          try {
            emailResult = await sendEmergencySOSEmail({
              toEmail: partner.email,
              partnerUsername: partner.username,
              senderUsername: req.user.username,
              customMessage: message && message.trim() ? message.trim() : null,
              streakCount: duo.duoStreak,
            });
          } catch (emailErr) {
            console.warn('[Nudge SOS Email Error]:', emailErr.message);
          }
        }
      }

      try {
        await sendPushToUser(partner._id, {
          title: pushTitle,
          body: pushBody,
          icon: '/pwa-192.png',
          badge: '/favicon.png',
          vibrate: vibratePattern,
          requireInteraction,
          tag,
          actions,
          data: {
            type,
            senderUsername: req.user.username,
            fromUsername: req.user.username,
            message: pushBody,
            url: pushUrl,
          },
        });
      } catch (pushErr) {
        console.warn(`[Nudge Push Error] Could not send ${type} push to partner ${partner._id}:`, pushErr.message);
      }
    }

    const roleActionMessages = {
      hype: `⚡ Hype pulse fired to @${partner ? partner.username : 'partner'}!`,
      nudge: `🔔 Habit reminder dispatched to @${partner ? partner.username : 'partner'}!`,
      sos: `🚨 EMERGENCY SOS ALARM & RESCUE EMAIL dispatched to @${partner ? partner.username : 'partner'}!`,
    };

    res.json({
      success: true,
      data: {
        duo: populatedDuo,
        type,
        message: roleActionMessages[type] || `Successfully sent ${type.toUpperCase()}!`,
        emailSent: !!(emailResult && emailResult.delivered),
        partnerUsername: partner ? partner.username : 'partner',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Unpair / leave Duo
 * POST /api/duo/unpair
 * Unlinks the Duo and generates brand new, unique invite codes for BOTH users
 */
async function unpairDuo(req, res, next) {
  try {
    if (!req.user.duoId) {
      return res.status(400).json({
        success: false,
        message: 'You are not in a Duo.',
      });
    }

    const duoId = req.user.duoId;
    const duo = await Duo.findById(duoId);
    if (duo) {
      duo.status = 'dissolved';
      await duo.save();
    }

    // Collect all user IDs affiliated with this Duo
    const userIds = new Set();
    if (duo && Array.isArray(duo.users)) {
      duo.users.forEach((id) => userIds.add(id.toString()));
    }
    userIds.add(req.user._id.toString());

    const usersWithDuoId = await User.find({ duoId }).select('_id');
    usersWithDuoId.forEach((u) => userIds.add(u._id.toString()));

    // Fetch all members to issue new unique codes
    const duoUsers = await User.find({ _id: { $in: Array.from(userIds) } });

    // Track newly issued codes so neither user gets the same code
    const newlyIssuedCodes = [];

    for (const u of duoUsers) {
      const oldCode = u.duoInviteCode;
      // Generate a new, unique code distinct from oldCode and any codes generated in this batch
      const newCode = await generateUniqueDuoInviteCode(User, [oldCode, ...newlyIssuedCodes]);
      newlyIssuedCodes.push(newCode);

      u.duoId = null;
      u.duoInviteCode = newCode;
      await u.save();
    }

    // Keep req.user in-memory instance synchronized
    const updatedSelf = duoUsers.find((u) => u._id.toString() === req.user._id.toString());
    if (updatedSelf) {
      req.user.duoId = null;
      req.user.duoInviteCode = updatedSelf.duoInviteCode;
    }

    // Notify the other partner that duo was unlinked
    for (const u of duoUsers) {
      if (u._id.toString() !== req.user._id.toString()) {
        try {
          sendPushToUser(u._id, {
            title: 'Duo Unlinked',
            body: `@${req.user.username} has unlinked from the Duo. You are now back in Solo Mode.`,
            icon: '/pwa-192.png',
            data: {
              type: 'duo-unpaired',
              url: '/dashboard',
            },
          }).catch(() => {});
        } catch (pushErr) {}
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Duo unlinked successfully. Brand new invite codes have been assigned to both users.',
        newDuoInviteCode: updatedSelf ? updatedSelf.duoInviteCode : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get shared synergy shells for current user and their Duo partner
 * GET /api/duo/shells
 */
async function getDuoShells(req, res, next) {
  try {
    if (!req.user.duoId) {
      return res.status(400).json({
        success: false,
        message: 'You need an active Duo to view shared shells.',
      });
    }

    const duo = await Duo.findById(req.user.duoId);
    if (!duo || duo.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Active Duo not found.',
      });
    }

    const currentUserId = req.user._id;
    const partnerId = duo.users.find(
      (u) => u.toString() !== currentUserId.toString()
    );

    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found.',
      });
    }

    const todayStr =
      req.headers['x-client-date'] ||
      req.query.date ||
      (() => {
        const tz = req.headers['x-timezone'];
        if (tz) {
          try {
            const dateInTz = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date());
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInTz)) return dateInTz;
          } catch (e) {}
        }
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();

    // Fetch active habits for both users
    const [userHabits, partnerHabits] = await Promise.all([
      Habit.find({ userId: currentUserId, isArchived: false }),
      Habit.find({ userId: partnerId, isArchived: false }),
    ]);

    const { clusterDuoHabitsIntoShells } = require('../utils/shellMatcher');
    const clustered = clusterDuoHabitsIntoShells(
      userHabits,
      partnerHabits,
      req.user,
      partner,
      todayStr
    );

    // Update duo synergy score based on actual shared shell performance
    if (clustered.stats.sharedShellCount > 0) {
      duo.synergyScore = clustered.stats.overallSynergy;
      await duo.save();
    }

    res.json({
      success: true,
      data: {
        todayStr,
        partner: {
          _id: partner._id,
          username: partner.username,
          customTitle: partner.customTitle,
        },
        sharedShells: clustered.sharedShells,
        soloShells: clustered.soloShells,
        stats: clustered.stats,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Solo & Duo Leaderboards
 * GET /api/duo/leaderboards
 */
async function getLeaderboards(req, res, next) {
  try {
    // 1. Fetch Top Solo Users from Database
    const soloUsers = await User.find(
      {},
      '_id username customTitle personalLevel personalXP soloStreak highestSoloStreak badges createdAt'
    )
      .sort({ soloStreak: -1, personalXP: -1, personalLevel: -1, createdAt: 1 })
      .limit(100)
      .lean();

    // Query active habit streak aggregates for all retrieved users
    const userIds = soloUsers.map((u) => u._id);
    const habitStreaks = await Habit.aggregate([
      { $match: { userId: { $in: userIds }, status: 'active', isArchived: false } },
      {
        $group: {
          _id: '$userId',
          maxCurrentStreak: { $max: '$currentStreak' },
          maxHighestStreak: { $max: '$highestStreak' },
        },
      },
    ]);

    const streakMap = {};
    habitStreaks.forEach((h) => {
      streakMap[h._id.toString()] = {
        current: h.maxCurrentStreak || 0,
        highest: h.maxHighestStreak || 0,
      };
    });

    const soloLeaderboard = soloUsers.map((u, index) => {
      const dynamicStreak = Math.max(streakMap[u._id.toString()]?.current || 0, u.soloStreak || 0);
      const dynamicHighest = Math.max(
        streakMap[u._id.toString()]?.highest || 0,
        u.highestSoloStreak || 0,
        dynamicStreak
      );

      return {
        rank: index + 1,
        userId: u._id,
        username: u.username,
        customTitle: u.customTitle || 'Habit Adventurer',
        personalLevel: u.personalLevel || 1,
        personalXP: u.personalXP || 0,
        soloStreak: dynamicStreak,
        highestSoloStreak: dynamicHighest,
        badgeCount: u.badges ? u.badges.length : 0,
        isCurrentUser: req.user ? req.user._id.toString() === u._id.toString() : false,
      };
    });

    // Re-sort accurately by real streaks, XP, level
    soloLeaderboard.sort(
      (a, b) =>
        b.soloStreak - a.soloStreak ||
        b.personalXP - a.personalXP ||
        b.personalLevel - a.personalLevel
    );
    soloLeaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // 2. Fetch Active Duos from Database (sorted by duoStreak, synergyScore, duoXP)
    const duos = await Duo.find({ status: 'active' })
      .populate('users', '_id username customTitle personalLevel')
      .sort({ duoStreak: -1, synergyScore: -1, duoXP: -1, createdAt: 1 })
      .limit(100)
      .lean();

    const duoLeaderboard = duos.map((d, index) => {
      const isCurrentDuo = req.user?.duoId && req.user.duoId.toString() === d._id.toString();
      return {
        rank: index + 1,
        duoId: d._id,
        duoName: d.duoName || 'Dynamic Duo',
        duoStreak: d.duoStreak || 0,
        highestStreak: d.highestStreak || d.duoStreak || 0,
        synergyScore: d.synergyScore ?? 100,
        duoXP: d.duoXP || 0,
        duoLevel: d.duoLevel || 1,
        members: (d.users || []).map((m) => ({
          _id: m._id,
          username: m.username,
          customTitle: m.customTitle || 'Adventurer',
          level: m.personalLevel || 1,
        })),
        isCurrentDuo,
      };
    });

    res.json({
      success: true,
      data: {
        soloLeaderboard,
        duoLeaderboard,
        currentUserId: req.user?._id,
        currentDuoId: req.user?.duoId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  lookupCode,
  pairDuo,
  getMyDuo,
  sendNudge,
  unpairDuo,
  getDuoShells,
  getLeaderboards,
};
