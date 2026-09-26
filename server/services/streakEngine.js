/**
 * TwoGether Shared Streak Engine
 * Evaluates midnight cutoffs, joint streak increments, shield protection, and resets.
 */
const Duo = require('../models/Duo');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { sendPushToUser } = require('../utils/pushNotify');

/**
 * Evaluates the daily streak for a specific duo on a given date string (YYYY-MM-DD).
 * @param {string|ObjectId} duoId
 * @param {string} targetDateStr - e.g. '2026-09-24'
 * @returns {Promise<Object>}
 */
async function evaluateDuoStreak(duoId, targetDateStr) {
  const duo = await Duo.findById(duoId);
  if (!duo || duo.status !== 'active') {
    return { success: false, message: 'Duo not found or not active' };
  }

  if (duo.users.length < 2) {
    return { success: false, message: 'Duo does not have two active members' };
  }

  const [userAId, userBId] = duo.users;
  const [userA, userB] = await Promise.all([
    User.findById(userAId).select('username pushSubscriptions'),
    User.findById(userBId).select('username pushSubscriptions'),
  ]);

  // Fetch all active, non-archived habits for both partners
  const [userAHabits, userBHabits] = await Promise.all([
    Habit.find({ userId: userAId, status: 'active', isArchived: false }),
    Habit.find({ userId: userBId, status: 'active', isArchived: false }),
  ]);

  function isHabitDueOnDate(h, dateStr) {
    const d = h.createdAt ? new Date(h.createdAt) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const effectiveStart = h.startDate || `${year}-${month}-${day}`;

    if (effectiveStart > dateStr) return false;
    if (h.endDate && h.endDate < dateStr) return false;
    return true;
  }

  // Determine completion for target date: all due active habits must be marked complete
  const userADue = userAHabits.filter((h) => isHabitDueOnDate(h, targetDateStr));
  const userBDue = userBHabits.filter((h) => isHabitDueOnDate(h, targetDateStr));

  const userADone =
    userADue.length > 0 &&
    userADue.every((h) => h.completedDates && h.completedDates.includes(targetDateStr));

  const userBDone =
    userBDue.length > 0 &&
    userBDue.every((h) => h.completedDates && h.completedDates.includes(targetDateStr));

  // Both partners completed all mandatory tasks
  if (userADone && userBDone) {
    // Avoid double incrementing if already evaluated for this exact date
    if (duo.lastCompletedDate !== targetDateStr) {
      duo.duoStreak = (duo.duoStreak || 0) + 1;
      duo.highestStreak = Math.max(duo.highestStreak || 0, duo.duoStreak);
      duo.lastCompletedDate = targetDateStr;
      duo.duoXP = (duo.duoXP || 0) + 50;
      duo.duoLevel = Math.max(1, Math.floor(duo.duoXP / 200) + 1);
      duo.synergyScore = 100;
      await duo.save();

      // Dispatch congratulatory push notifications
      const pushMsg = {
        title: '🔥 Shared Duo Streak Extended!',
        body: `Unbreakable synergy! All habits completed for ${targetDateStr}. Joint streak is now ${duo.duoStreak} days!`,
        icon: '/pwa-192.png',
        data: { type: 'streak-increment', duoStreak: duo.duoStreak, url: '/dashboard' },
      };
      sendPushToUser(userAId, pushMsg).catch(() => {});
      sendPushToUser(userBId, pushMsg).catch(() => {});
    }

    return {
      success: true,
      outcome: 'incremented',
      duoStreak: duo.duoStreak,
      highestStreak: duo.highestStreak,
      duoShields: duo.duoShields,
      lastCompletedDate: duo.lastCompletedDate,
      userACompleted: userADone,
      userBCompleted: userBDone,
    };
  }

  // At least one partner failed to complete all habits before cutoff
  // Check if already handled for target date
  if (duo.lastCompletedDate === targetDateStr) {
    return {
      success: true,
      outcome: 'already_evaluated',
      duoStreak: duo.duoStreak,
      duoShields: duo.duoShields,
      lastCompletedDate: duo.lastCompletedDate,
    };
  }

  // Check if Streak Shield is available to absorb the loss
  if (duo.duoShields > 0) {
    duo.duoShields -= 1;
    duo.lastCompletedDate = targetDateStr;
    await duo.save();

    const shieldMsg = {
      title: '🛡️ Streak Shield Activated!',
      body: `Daily habits were missed on ${targetDateStr}, but your streak shield protected your ${duo.duoStreak}-day streak! (${duo.duoShields} shield remaining)`,
      icon: '/pwa-192.png',
      data: { type: 'shield-used', duoStreak: duo.duoStreak, remainingShields: duo.duoShields, url: '/dashboard' },
    };
    sendPushToUser(userAId, shieldMsg).catch(() => {});
    sendPushToUser(userBId, shieldMsg).catch(() => {});

    return {
      success: true,
      outcome: 'shield_protected',
      duoStreak: duo.duoStreak,
      duoShields: duo.duoShields,
      shieldUsed: true,
      lastCompletedDate: duo.lastCompletedDate,
      userACompleted: userADone,
      userBCompleted: userBDone,
    };
  }

  // No shields available — Reset duo streak to 0
  const previousStreak = duo.duoStreak;
  duo.duoStreak = 0;
  duo.lastCompletedDate = targetDateStr;
  duo.synergyScore = Math.max(0, (duo.synergyScore || 100) - 20);
  await duo.save();

  const resetMsg = {
    title: '💔 Duo Streak Reset',
    body: `Daily habits were missed before midnight cutoff without an active shield. Your streak has reset to 0. Let's restart tomorrow!`,
    icon: '/pwa-192.png',
    data: { type: 'streak-reset', previousStreak, url: '/dashboard' },
  };
  sendPushToUser(userAId, resetMsg).catch(() => {});
  sendPushToUser(userBId, resetMsg).catch(() => {});

  return {
    success: true,
    outcome: 'reset',
    duoStreak: 0,
    previousStreak,
    duoShields: 0,
    shieldUsed: false,
    lastCompletedDate: duo.lastCompletedDate,
    userACompleted: userADone,
    userBCompleted: userBDone,
  };
}

/**
 * Run midnight evaluation across all active duos for a given date
 * @param {string} targetDateStr - e.g. '2026-09-24'
 */
async function evaluateAllDuosAtMidnight(targetDateStr) {
  const activeDuos = await Duo.find({ status: 'active' });
  const results = {
    date: targetDateStr,
    total: activeDuos.length,
    incremented: 0,
    shieldProtected: 0,
    reset: 0,
    alreadyEvaluated: 0,
  };

  for (const duo of activeDuos) {
    try {
      const res = await evaluateDuoStreak(duo._id, targetDateStr);
      if (res.outcome === 'incremented') results.incremented++;
      else if (res.outcome === 'shield_protected') results.shieldProtected++;
      else if (res.outcome === 'reset') results.reset++;
      else if (res.outcome === 'already_evaluated') results.alreadyEvaluated++;
    } catch (err) {
      console.error(`Failed to evaluate streak for Duo ${duo._id}:`, err);
    }
  }

  return results;
}

module.exports = {
  evaluateDuoStreak,
  evaluateAllDuosAtMidnight,
};
