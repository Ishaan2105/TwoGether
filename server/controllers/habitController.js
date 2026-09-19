const Habit = require('../models/Habit');
const User = require('../models/User');
const Duo = require('../models/Duo');

function getTodayDateStr(req) {
  if (req) {
    const clientDate = req.headers?.['x-client-date'] || req.headers?.['x-today-date'];
    if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
      return clientDate;
    }
    const tz = req.headers?.['x-timezone'];
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
  }
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateToStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate count of days between two 'YYYY-MM-DD' dates inclusive
 */
function getDaysBetween(startStr, endStr) {
  if (!startStr || !endStr || startStr > endStr) return 0;
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get all habits/daily tasks for the current user
 * GET /api/habits
 * Query params: ?status=active|completed|all
 */
async function getHabits(req, res, next) {
  try {
    const todayStr = getTodayDateStr(req);
    const user = await User.findById(req.user._id);
    const joinDateStr = user?.createdAt ? formatDateToStr(user.createdAt) : todayStr;
    const statusQuery = req.query.status || 'active';

    const filter = { userId: req.user._id, isArchived: false };
    if (statusQuery === 'active') {
      filter.status = 'active';
    } else if (statusQuery === 'completed') {
      filter.status = 'completed';
    }

    const habits = await Habit.find(filter).sort({ createdAt: 1 });

    // Also count total completed/active for tabs
    const [activeCount, completedCountTotal] = await Promise.all([
      Habit.countDocuments({ userId: req.user._id, status: 'active', isArchived: false }),
      Habit.countDocuments({ userId: req.user._id, status: 'completed', isArchived: false }),
    ]);

    const formattedHabits = habits.map((h) => {
      const isCompletedToday = h.completedDates.includes(todayStr);
      const effectiveStart = h.startDate || formatDateToStr(h.createdAt);
      const effectiveEnd = h.endDate || null;

      // Completed checkins within the habit's active date range
      const validCompletedDates = h.completedDates.filter((d) => {
        if (d < effectiveStart) return false;
        if (effectiveEnd && d > effectiveEnd) return false;
        return true;
      });

      // Calculate elapsed active days up to today (or end date/closed date)
      const maxElapsedDate = h.status === 'completed' && h.closedAt
        ? formatDateToStr(h.closedAt)
        : (effectiveEnd && effectiveEnd < todayStr ? effectiveEnd : todayStr);

      const elapsedDays = Math.max(1, getDaysBetween(effectiveStart, maxElapsedDate));
      const targetDays = h.targetDays || (effectiveEnd ? getDaysBetween(effectiveStart, effectiveEnd) : null);
      
      const accuracyPct = elapsedDays > 0
        ? Math.round((validCompletedDates.length / elapsedDays) * 100)
        : 0;

      let daysRemaining = null;
      if (effectiveEnd && h.status === 'active') {
        const remaining = getDaysBetween(todayStr, effectiveEnd) - 1;
        daysRemaining = Math.max(0, remaining);
      }

      return {
        ...h.toObject(),
        isCompletedToday,
        effectiveStart,
        effectiveEnd,
        validCompletedCount: validCompletedDates.length,
        elapsedDays,
        targetDays,
        accuracyPct: h.status === 'completed' && h.finalAccuracy !== null ? h.finalAccuracy : accuracyPct,
        daysRemaining,
      };
    });

    const activeHabits = formattedHabits.filter((h) => h.status === 'active');
    const totalActive = activeHabits.length;
    const completedTodayCount = activeHabits.filter((h) => h.isCompletedToday).length;
    const percentComplete = totalActive > 0 ? Math.round((completedTodayCount / totalActive) * 100) : 0;

    res.json({
      success: true,
      data: {
        habits: formattedHabits,
        counts: {
          active: activeCount,
          completed: completedCountTotal,
        },
        summary: {
          todayStr,
          joinDateStr,
          totalHabits: totalActive,
          completedCount: completedTodayCount,
          percentComplete,
          todayXP: completedTodayCount * 15,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new habit/task (Ongoing or Time-Bounded Sprint)
 * POST /api/habits
 */
async function createHabit(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      icon,
      priority,
      timeOfDay,
      habitType,
      startDate,
      endDate,
      targetDays,
      objectiveNote,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.',
      });
    }

    const todayStr = getTodayDateStr(req);
    const effectiveStart = startDate ? startDate.trim() : todayStr;
    const effectiveEnd = endDate ? endDate.trim() : null;

    let computedTargetDays = targetDays ? Number(targetDays) : null;
    if (!computedTargetDays && effectiveEnd && effectiveStart) {
      computedTargetDays = getDaysBetween(effectiveStart, effectiveEnd);
    }

    const habit = await Habit.create({
      userId: req.user._id,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'Productivity',
      icon: icon || '🎯',
      priority: priority || 'medium',
      timeOfDay: timeOfDay || 'anytime',
      habitType: habitType === 'sprint' ? 'sprint' : 'ongoing',
      startDate: effectiveStart,
      endDate: effectiveEnd,
      targetDays: computedTargetDays,
      status: 'active',
      objectiveNote: (objectiveNote || '').trim(),
      currentStreak: 0,
      highestStreak: 0,
      completedDates: [],
    });

    res.status(201).json({
      success: true,
      data: {
        habit: {
          ...habit.toObject(),
          isCompletedToday: false,
          effectiveStart,
          effectiveEnd,
          validCompletedCount: 0,
          elapsedDays: 1,
          accuracyPct: 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing habit/task
 * PUT /api/habits/:id
 */
async function updateHabit(req, res, next) {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (habit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this task.',
      });
    }

    const {
      title,
      description,
      category,
      icon,
      priority,
      timeOfDay,
      habitType,
      startDate,
      endDate,
      targetDays,
      objectiveNote,
    } = req.body;

    if (title !== undefined) habit.title = title.trim();
    if (description !== undefined) habit.description = description.trim();
    if (category !== undefined) habit.category = category;
    if (icon !== undefined) habit.icon = icon;
    if (priority !== undefined) habit.priority = priority;
    if (timeOfDay !== undefined) habit.timeOfDay = timeOfDay;
    if (habitType !== undefined) habit.habitType = habitType;
    if (startDate !== undefined) habit.startDate = startDate;
    if (endDate !== undefined) habit.endDate = endDate;
    if (targetDays !== undefined) habit.targetDays = targetDays;
    if (objectiveNote !== undefined) habit.objectiveNote = objectiveNote;

    await habit.save();

    const todayStr = getTodayDateStr(req);
    const isCompletedToday = habit.completedDates.includes(todayStr);

    res.json({
      success: true,
      data: {
        habit: {
          ...habit.toObject(),
          isCompletedToday,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Close / Conclude a Time-Bounded Sprint Habit
 * POST /api/habits/:id/close
 */
async function closeHabit(req, res, next) {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (habit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this task.',
      });
    }

    const todayStr = getTodayDateStr(req);
    const effectiveStart = habit.startDate || formatDateToStr(habit.createdAt);

    // Filter checkins within active window
    const validCompletedDates = habit.completedDates.filter((d) => {
      if (d < effectiveStart) return false;
      if (d > todayStr) return false;
      return true;
    });

    const elapsedDays = Math.max(1, getDaysBetween(effectiveStart, todayStr));
    const accuracy = Math.round((validCompletedDates.length / elapsedDays) * 100);

    habit.status = 'completed';
    habit.closedAt = new Date();
    habit.finalAccuracy = accuracy;
    if (req.body.objectiveNote || req.body.note) {
      habit.objectiveNote = (req.body.objectiveNote || req.body.note).trim();
    }

    await habit.save();

    // Grant bonus XP for successful goal completion (+50 XP if >= 80% accuracy)
    let bonusXP = 0;
    let user = await User.findById(req.user._id);
    if (accuracy >= 80) {
      bonusXP = 50;
      if (user) {
        user.personalXP = (user.personalXP || 0) + bonusXP;
        user.personalLevel = Math.max(1, Math.floor(user.personalXP / 100) + 1);
        await user.save();
      }
    }

    res.json({
      success: true,
      data: {
        habit: {
          ...habit.toObject(),
          accuracyPct: accuracy,
        },
        bonusXP,
        bonusAwarded: bonusXP > 0,
        user: {
          personalXP: user ? user.personalXP : 0,
          personalLevel: user ? user.personalLevel : 1,
        },
        message: `Goal concluded with ${accuracy}% accuracy! ${
          bonusXP > 0 ? `+${bonusXP} Bonus XP awarded.` : ''
        }`,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reopen a Completed / Closed Habit back to Active
 * POST /api/habits/:id/reopen
 */
async function reopenHabit(req, res, next) {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (habit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this task.',
      });
    }

    habit.status = 'active';
    habit.closedAt = null;
    habit.finalAccuracy = null;
    await habit.save();

    res.json({
      success: true,
      data: {
        habit: habit.toObject(),
        message: 'Habit reopened and set to active status.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a habit/task
 * DELETE /api/habits/:id
 */
async function deleteHabit(req, res, next) {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (habit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task.',
      });
    }

    await Habit.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {
        message: 'Task deleted successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle check-in status for today
 * POST /api/habits/:id/toggle
 */
async function toggleHabit(req, res, next) {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (habit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check in this task.',
      });
    }

    const todayStr = getTodayDateStr(req);
    const targetDateStr = req.body.date || todayStr;

    // Strict validation: Only today's date is editable
    if (targetDateStr < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Past days cannot be edited to protect genuine streak integrity.',
      });
    }

    if (targetDateStr > todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Future days cannot be checked in advance.',
      });
    }

    const isCurrentlyCompleted = habit.completedDates.includes(todayStr);

    let xpChange = 0;

    if (isCurrentlyCompleted) {
      // Uncheck
      habit.completedDates = habit.completedDates.filter((d) => d !== todayStr);
      habit.currentStreak = Math.max(0, habit.currentStreak - 1);
      xpChange = -15;
    } else {
      // Check in
      habit.completedDates.push(todayStr);
      habit.currentStreak += 1;
      if (habit.currentStreak > habit.highestStreak) {
        habit.highestStreak = habit.currentStreak;
      }
      xpChange = 15;
    }

    await habit.save();

    // Update user personal XP, Level, and soloStreak
    const user = await User.findById(req.user._id);
    if (user) {
      user.personalXP = Math.max(0, (user.personalXP || 0) + xpChange);
      user.personalLevel = Math.max(1, Math.floor(user.personalXP / 100) + 1);

      // Recompute user's active solo streak from their active habits
      const userHabits = await Habit.find({ userId: user._id, status: 'active', isArchived: false });
      const maxStreak = userHabits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);
      user.soloStreak = maxStreak;
      user.highestSoloStreak = Math.max(user.highestSoloStreak || 0, maxStreak);

      await user.save();
    }

    // If user is in a Duo, also reward Duo XP on positive check in
    if (user && user.duoId && xpChange > 0) {
      const duo = await Duo.findById(user.duoId);
      if (duo && duo.status === 'active') {
        duo.duoXP = (duo.duoXP || 0) + 10;
        duo.duoLevel = Math.max(1, Math.floor(duo.duoXP / 200) + 1);
        await duo.save();
      }
    }

    res.json({
      success: true,
      data: {
        habit: {
          ...habit.toObject(),
          isCompletedToday: !isCurrentlyCompleted,
        },
        user: {
          personalXP: user ? user.personalXP : 0,
          personalLevel: user ? user.personalLevel : 1,
        },
        message: !isCurrentlyCompleted
          ? 'Task completed! +15 XP earned.'
          : 'Task unchecked.',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHabits,
  createHabit,
  updateHabit,
  closeHabit,
  reopenHabit,
  deleteHabit,
  toggleHabit,
};
