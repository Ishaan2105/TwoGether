import { useState, useRef, useEffect, useMemo } from 'react';
import { exportHabitMatrixToExcel } from '../../utils/excelExport.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DEFAULT_BLANK_ROWS_COUNT = 6;

export default function HabitMatrixGrid({
  habits = [],
  selectedYear,
  selectedMonth,
  todayStr,
  joinDateStr,
  onToggleToday,
  onInlineCreateHabit,
  onInlineUpdateHabit,
  onDeleteHabit,
  onOpenAddModal,
  onCloseGoal,
  onReopenGoal,
  togglingHabitId,
}) {
  // Compute total days in selected month (1..28/29/30/31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of day objects for the month
  const monthDays = useMemo(() => {
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const y = selectedYear;
      const m = String(selectedMonth + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayPadded}`;
      const dayOfWeek = WEEKDAYS[dateObj.getDay()];
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const isPreJoin = joinDateStr ? dateStr < joinDateStr : false;

      days.push({
        dayNum: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        isToday,
        isPast,
        isFuture,
        isPreJoin,
      });
    }
    return days;
  }, [selectedYear, selectedMonth, daysInMonth, todayStr, joinDateStr]);

  // Local draft state for empty spreadsheet rows
  const [blankRows, setBlankRows] = useState(() =>
    Array(DEFAULT_BLANK_ROWS_COUNT).fill('')
  );

  // Track history stack of added row counts for undo support
  const [rowHistory, setRowHistory] = useState([]);

  // Add 3 blank spreadsheet rows with history tracking
  const handleAddRows = () => {
    setRowHistory((prev) => [...prev, blankRows.length]);
    setBlankRows((prev) => [...prev, '', '', '']);
  };

  // Undo recently added blank rows
  const handleUndoAddRows = () => {
    if (rowHistory.length === 0 && blankRows.length <= DEFAULT_BLANK_ROWS_COUNT) return;

    setRowHistory((prev) => {
      const nextHist = [...prev];
      const targetCount = nextHist.length > 0
        ? nextHist.pop()
        : Math.max(DEFAULT_BLANK_ROWS_COUNT, blankRows.length - 3);

      setBlankRows((curr) => {
        if (curr.length <= targetCount) return curr;
        const trimmed = [...curr];
        while (trimmed.length > targetCount) {
          // If the last row contains user text, stop so we don't discard user draft work
          if (trimmed[trimmed.length - 1] && trimmed[trimmed.length - 1].trim()) {
            break;
          }
          trimmed.pop();
        }
        return trimmed;
      });

      return nextHist;
    });
  };

  const canUndoAddRows = blankRows.length > DEFAULT_BLANK_ROWS_COUNT || rowHistory.length > 0;

  // Local edit cache for existing habits so typing is silky smooth before saving
  const [habitTitles, setHabitTitles] = useState({});

  useEffect(() => {
    const map = {};
    habits.forEach((h) => {
      map[h._id] = h.title;
    });
    setHabitTitles(map);
  }, [habits]);

  // Refs for Excel-like keyboard navigation across inputs
  const inputRefs = useRef({});

  // Focus helper
  const focusInput = (key) => {
    if (inputRefs.current[key]) {
      inputRefs.current[key].focus();
    }
  };

  // Handle key down in existing habit input
  const handleExistingKeyDown = (e, habitId, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentVal = habitTitles[habitId];
      if (currentVal && currentVal.trim()) {
        onInlineUpdateHabit(habitId, { title: currentVal.trim() });
      }
      // Move focus down
      if (index + 1 < habits.length) {
        focusInput(`habit-${habits[index + 1]._id}`);
      } else {
        focusInput('blank-0');
      }
    } else if (e.key === 'ArrowDown') {
      if (index + 1 < habits.length) {
        focusInput(`habit-${habits[index + 1]._id}`);
      } else {
        focusInput('blank-0');
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      focusInput(`habit-${habits[index - 1]._id}`);
    }
  };

  // Handle blur for existing habit
  const handleExistingBlur = (habitId) => {
    const habit = habits.find((h) => h._id === habitId);
    const currentVal = habitTitles[habitId];
    if (habit && currentVal && currentVal.trim() !== habit.title) {
      onInlineUpdateHabit(habitId, { title: currentVal.trim() });
    }
  };

  // Handle change for blank row
  const handleBlankChange = (index, value) => {
    setBlankRows((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Commit a blank row to create a new habit
  const commitBlankRow = async (index, shouldFocusNext = false) => {
    const titleToCreate = (blankRows[index] || '').trim();
    if (!titleToCreate) return;

    // Clear that row's local draft
    setBlankRows((prev) => {
      const next = [...prev];
      next[index] = '';
      return next;
    });

    // Call create habit API
    await onInlineCreateHabit({
      title: titleToCreate,
      category: 'Productivity',
      icon: '🎯',
      priority: 'medium',
    });

    if (shouldFocusNext) {
      setTimeout(() => {
        focusInput(`blank-${index}`);
      }, 100);
    }
  };

  // Handle key down in blank row
  const handleBlankKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitBlankRow(index, true);
    } else if (e.key === 'ArrowUp') {
      if (index === 0 && habits.length > 0) {
        focusInput(`habit-${habits[habits.length - 1]._id}`);
      } else if (index > 0) {
        focusInput(`blank-${index - 1}`);
      }
    } else if (e.key === 'ArrowDown' && index + 1 < blankRows.length) {
      focusInput(`blank-${index + 1}`);
    }
  };

  // Calculate daily completion counts for footer
  const dailyStats = useMemo(() => {
    return monthDays.map((day) => {
      if (habits.length === 0) return { total: 0, completed: 0, percent: 0 };
      
      // Filter habits that are active on this specific day
      const activeHabitsOnDay = habits.filter((h) => {
        const start = h.startDate || h.createdAt?.slice(0, 10);
        if (start && day.dateStr < start) return false;
        if (h.endDate && day.dateStr > h.endDate) return false;
        return true;
      });

      const total = activeHabitsOnDay.length;
      const completed = activeHabitsOnDay.filter((h) =>
        (h.completedDates || []).includes(day.dateStr)
      ).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percent };
    });
  }, [monthDays, habits]);

  // Calculate stats for a single habit in selected month
  const getHabitMonthStats = (habit) => {
    let completedCount = 0;
    let eligibleDays = 0;
    const start = habit.startDate || habit.createdAt?.slice(0, 10);
    const end = habit.endDate || null;

    monthDays.forEach((day) => {
      if (day.isPreJoin || day.isFuture) return;
      if (start && day.dateStr < start) return;
      if (end && day.dateStr > end) return;

      eligibleDays++;
      if ((habit.completedDates || []).includes(day.dateStr)) {
        completedCount++;
      }
    });

    const percent =
      habit.status === 'completed' && habit.finalAccuracy !== undefined
        ? habit.finalAccuracy
        : eligibleDays > 0
        ? Math.round((completedCount / eligibleDays) * 100)
        : 0;

    return { completedCount, eligibleDays, percent };
  };

  // Export to Excel handler
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportHabitMatrixToExcel({
        habits,
        selectedYear,
        selectedMonth,
        monthDays,
        dailyStats,
        getHabitMonthStats,
      });
      setTimeout(() => setIsExporting(false), 2000);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
      setIsExporting(false);
    }
  };

  // Scroll Container Ref for auto-centering today
  const scrollContainerRef = useRef(null);

  // Adjust column widths so exactly 15 days are visible in viewport on mobile/PWA
  const updateMobileColWidths = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    if (!containerWidth) return;

    const isMobileScreen =
      window.innerWidth <= 1024 ||
      window.innerHeight <= 650 ||
      document.documentElement.classList.contains('landscape-mode') ||
      document.documentElement.classList.contains('app-forced-landscape') ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobileScreen) {
      // Habit column has generous width matching expanded view on phone (340px - 440px)
      const habitWidth = Math.max(340, Math.min(440, Math.round(containerWidth * 0.45)));
      const visibleDaysWidth = Math.max(300, containerWidth - habitWidth);
      // Exactly 15 days visible in remaining viewport area
      const dayWidth = Math.max(36, +(visibleDaysWidth / 12).toFixed(2));
      const statWidth = Math.max(105, Math.round(dayWidth * 2.5));

      container.style.setProperty('--spreadsheet-habit-width', `${habitWidth}px`);
      container.style.setProperty('--spreadsheet-day-width', `${dayWidth}px`);
      container.style.setProperty('--spreadsheet-stat-width', `${statWidth}px`);
    } else {
      container.style.removeProperty('--spreadsheet-habit-width');
      container.style.removeProperty('--spreadsheet-day-width');
      container.style.removeProperty('--spreadsheet-stat-width');
    }
  };

  // Center today's date column in the visible spreadsheet viewport
  const centerToday = (behavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateMobileColWidths();

    requestAnimationFrame(() => {
      if (!container) return;

      // Find the today column header
      const todayHeader = container.querySelector('.spreadsheet-th-day.spreadsheet-col--today') ||
        container.querySelector('.spreadsheet-col--today');

      if (!todayHeader) {
        if (behavior === 'auto') {
          container.scrollLeft = 0;
        }
        return;
      }

      // Dynamic measurement of the sticky habit title column (left: 0)
      const stickyHabitHeader = container.querySelector('.spreadsheet-th-habit');
      const stickyLeftWidth = stickyHabitHeader ? stickyHabitHeader.offsetWidth : 180;

      const containerWidth = container.clientWidth;
      const todayLeft = todayHeader.offsetLeft;
      const todayWidth = todayHeader.offsetWidth;
      const todayCenter = todayLeft + todayWidth / 2;

      // Center of visible days area is at stickyLeftWidth + (containerWidth - stickyLeftWidth) / 2
      // Target scrollLeft = todayCenter - (stickyLeftWidth / 2 + containerWidth / 2)
      const targetScrollLeft = todayCenter - (stickyLeftWidth / 2 + containerWidth / 2);
      const maxScrollLeft = Math.max(0, container.scrollWidth - containerWidth);
      const clampedScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));

      if (behavior === 'auto') {
        container.scrollLeft = clampedScrollLeft;
      } else {
        container.scrollTo({
          left: clampedScrollLeft,
          behavior,
        });
      }
    });
  };

  // Automatically center today's date on initial mount, month switch, or habits load
  useEffect(() => {
    const runCentering = (mode = 'auto') => {
      centerToday(mode);
    };

    runCentering('auto');
    const timer1 = setTimeout(() => runCentering('auto'), 60);
    const timer2 = setTimeout(() => runCentering('auto'), 200);
    const timer3 = setTimeout(() => runCentering('auto'), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [selectedYear, selectedMonth, todayStr, habits.length]);

  // Keep centered on window or container resize / orientation change / new-day tick
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      centerToday('auto');
    };

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('twogether:new-day', handleResize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('twogether:new-day', handleResize);
    };
  }, [selectedYear, selectedMonth, todayStr]);

  const hasTodayInMonth = useMemo(() => {
    return monthDays.some((d) => d.isToday);
  }, [monthDays]);

  return (
    <div className="spreadsheet-wrapper">
      {/* Spreadsheet Quick Actions Bar */}
      <div className="spreadsheet-toolbar">
        <div className="spreadsheet-toolbar__left">
          <span className="spreadsheet-badge">SPREADSHEET VIEW</span>
          <span className="spreadsheet-hint">
            Click directly under <strong>HABIT</strong> to type. Press <kbd>Enter</kbd> to save. Out-of-range sprint days are never penalized.
          </span>
        </div>
        <div className="spreadsheet-toolbar__right">
          {hasTodayInMonth && (
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => centerToday('smooth')}
              title="Center today's date column in view"
            >
              📅 Center Today
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={onOpenAddModal}
            title="Open Detailed Habit Builder modal"
          >
            + New Goal / Habit
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={handleAddRows}
            title="Add 3 blank spreadsheet rows"
          >
            + Add Rows
          </button>
          {/* Undo button commented out
          <button
            type="button"
            className={`btn btn--ghost btn--xs spreadsheet-undo-btn ${canUndoAddRows ? '' : 'spreadsheet-undo-btn--disabled'}`}
            onClick={handleUndoAddRows}
            disabled={!canUndoAddRows}
            title={canUndoAddRows ? "Undo last added blank rows" : "No added rows to undo"}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
            <span>Undo</span>
          </button>
          */}
          <button
            type="button"
            className={`btn btn--ghost btn--xs spreadsheet-export-btn ${isExporting ? 'spreadsheet-export-btn--loading' : ''}`}
            onClick={handleExportExcel}
            disabled={isExporting}
            title="Download full monthly habit tracker as an Excel (.xlsx) spreadsheet"
          >
            {isExporting ? (
              <>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Exported!</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export to Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spreadsheet Scrollable Table */}
      <div ref={scrollContainerRef} className="spreadsheet-scroll-container">
        <table className="spreadsheet-table" aria-label="Excel Habit Tracker Sheet">
          {/* Header Row: HABIT and numbered 1..31 columns */}
          <thead>
            <tr className="spreadsheet-header-row">
              {/* Top-Left Header: HABIT */}
              <th className="spreadsheet-th-habit">
                <div className="spreadsheet-th-habit__inner">
                  <span className="spreadsheet-th-title">HABIT / GOAL</span>
                  <span className="spreadsheet-th-count">
                    {habits.length} {habits.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </th>

              {/* Numbered Day Columns (1, 2, 3 ... 31) */}
              {monthDays.map((day) => {
                let colClass = 'spreadsheet-th-day';
                if (day.isToday) colClass += ' spreadsheet-col--today';
                if (day.isWeekend) colClass += ' spreadsheet-col--weekend';
                if (day.isPreJoin) colClass += ' spreadsheet-col--prejoin';

                return (
                  <th
                    key={day.dateStr}
                    className={colClass}
                    title={`${day.dateStr} (${day.dayOfWeek})${day.isToday ? ' - TODAY' : ''}${
                      day.isPreJoin ? ' - Before Registration' : ''
                    }`}
                  >
                    <div className={`spreadsheet-th-day__content ${day.isToday ? 'spreadsheet-th-day__content--today' : ''}`}>
                      <span className="spreadsheet-th-day__num">{day.dayNum}</span>
                      <span className="spreadsheet-th-day__weekday">{day.dayOfWeek}</span>
                      {day.isToday && <span className="spreadsheet-today-pill">TODAY</span>}
                    </div>
                  </th>
                );
              })}

              {/* Right Summary Header */}
              <th className="spreadsheet-th-stats">ACCURACY</th>
            </tr>
          </thead>

          <tbody>
            {/* 1. Existing Active Habits Rows */}
            {habits.map((habit, idx) => {
              const { completedCount, eligibleDays, percent } = getHabitMonthStats(habit);
              const titleVal = habitTitles[habit._id] ?? habit.title;
              const habitStart = habit.startDate || habit.createdAt?.slice(0, 10);
              const habitEnd = habit.endDate || null;
              const isSprint = habit.habitType === 'sprint';
              const isCompletedGoal = habit.status === 'completed';

              return (
                <tr
                  key={habit._id}
                  className={`spreadsheet-row spreadsheet-row--active ${
                    isSprint ? 'spreadsheet-row--sprint' : ''
                  } ${isCompletedGoal ? 'spreadsheet-row--completed-goal' : ''}`}
                >
                  {/* Left Column: Direct Inline Editable Habit Name + Sprint Badge */}
                  <td className="spreadsheet-td-habit">
                    <div className="spreadsheet-habit-cell">
                      <span className="spreadsheet-row-index">{idx + 1}</span>
                      <span className="spreadsheet-habit-icon" aria-hidden="true">
                        {habit.icon || (isSprint ? '🎯' : '⚡')}
                      </span>
                      <input
                        ref={(el) => (inputRefs.current[`habit-${habit._id}`] = el)}
                        type="text"
                        className="spreadsheet-habit-input"
                        value={titleVal}
                        onChange={(e) =>
                          setHabitTitles({ ...habitTitles, [habit._id]: e.target.value })
                        }
                        onKeyDown={(e) => handleExistingKeyDown(e, habit._id, idx)}
                        onBlur={() => handleExistingBlur(habit._id)}
                        placeholder="Enter habit name..."
                        title="Click to edit habit name directly. Press Enter to save."
                      />

                      {/* Sprint Goal Badges & Quick Conclude button */}
                      {isSprint && (
                        <span
                          className={`spreadsheet-sprint-badge ${
                            isCompletedGoal ? 'spreadsheet-sprint-badge--completed' : ''
                          }`}
                          title={`Sprint Goal: ${habitStart || 'Start'} to ${
                            habitEnd || 'Indefinite'
                          } (${habit.targetDays || 5} days)`}
                        >
                          {isCompletedGoal ? 'Goal Met ✓' : `Sprint · ${habit.targetDays || 5}d`}
                        </span>
                      )}

                      {habit.currentStreak > 0 && !isCompletedGoal && (
                        <span
                          className="spreadsheet-streak-tag"
                          title={`Current Streak: ${habit.currentStreak} days`}
                        >
                          {habit.currentStreak}d
                        </span>
                      )}

                      {/* Conclude Sprint Button */}
                      {isSprint && !isCompletedGoal && onCloseGoal && (
                        <button
                          type="button"
                          className="spreadsheet-conclude-btn"
                          onClick={() => onCloseGoal(habit)}
                          title="Conclude / Finish this exam or sprint goal and freeze accuracy"
                        >
                          Finish Goal
                        </button>
                      )}

                      {/* Reopen Concluded Goal Button */}
                      {isCompletedGoal && onReopenGoal && (
                        <button
                          type="button"
                          className="spreadsheet-reopen-btn"
                          onClick={() => onReopenGoal(habit)}
                          title="Reopen this completed goal back into active habits"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        type="button"
                        className="spreadsheet-delete-btn"
                        onClick={() => onDeleteHabit(habit._id)}
                        title={`Delete "${habit.title}"`}
                        aria-label={`Delete ${habit.title}`}
                      >
                        ✕
                      </button>
                    </div>
                  </td>

                  {/* Day Checkmark Cells (1..31) */}
                  {monthDays.map((day) => {
                    const isCompleted = (habit.completedDates || []).includes(day.dateStr);
                    const isToggling = togglingHabitId === habit._id && day.isToday;
                    
                    // Out-of-range checks for sprint bounds or mid-month start dates
                    const isBeforeHabitStart = habitStart ? day.dateStr < habitStart : false;
                    const isAfterHabitEnd = habitEnd ? day.dateStr > habitEnd : false;
                    const isOutOfRange = isBeforeHabitStart || isAfterHabitEnd;

                    let cellClass = 'spreadsheet-td-day';
                    if (day.isToday) cellClass += ' spreadsheet-col--today';
                    if (day.isWeekend) cellClass += ' spreadsheet-col--weekend';
                    if (day.isPreJoin) cellClass += ' spreadsheet-col--prejoin';
                    if (isOutOfRange) cellClass += ' spreadsheet-col--out-of-range';

                    return (
                      <td key={day.dateStr} className={cellClass}>
                        {day.isPreJoin ? (
                          /* Pre-Registration Date: Muted / Empty */
                          <div
                            className="spreadsheet-cell spreadsheet-cell--prejoin"
                            title={`Registered after this date (${day.dateStr})`}
                          >
                            <span className="spreadsheet-mark spreadsheet-mark--dim">·</span>
                          </div>
                        ) : isOutOfRange ? (
                          /* Out of Sprint Range (Started after this date or completed before): Neutral */
                          <div
                            className="spreadsheet-cell spreadsheet-cell--out-of-range"
                            title={`Outside goal window for "${habit.title}" (${
                              isBeforeHabitStart
                                ? `Goal starts on ${habitStart}`
                                : `Goal completed on ${habitEnd}`
                            })`}
                          >
                            <span className="spreadsheet-mark spreadsheet-mark--neutral">—</span>
                          </div>
                        ) : day.isPast ? (
                          /* Past Date inside active window: Strictly View-Only / Locked */
                          <div
                            className={`spreadsheet-cell spreadsheet-cell--locked ${
                              isCompleted
                                ? 'spreadsheet-cell--completed-past'
                                : 'spreadsheet-cell--missed-past'
                            }`}
                            title={`${habit.title} on ${day.dateStr}: ${
                              isCompleted ? 'Completed' : 'Missed'
                            } (Past days are locked)`}
                          >
                            {isCompleted && (
                              <svg
                                className="spreadsheet-check-svg"
                                viewBox="0 0 12 12"
                                width="11"
                                height="11"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="2.5 6.5 5 9 9.5 3.5" />
                              </svg>
                            )}
                          </div>
                        ) : day.isToday ? (
                          /* Today: Interactive Checkmark Cell (Click to mark checkmark!) */
                          <button
                            type="button"
                            className={`spreadsheet-cell spreadsheet-cell--today ${
                              isCompleted
                                ? 'spreadsheet-cell--completed-today'
                                : 'spreadsheet-cell--pending-today'
                            } ${isToggling ? 'spreadsheet-cell--loading' : ''}`}
                            onClick={() => onToggleToday(habit._id)}
                            disabled={isToggling || isCompletedGoal}
                            aria-label={`Check in ${habit.title} for today: ${
                              isCompleted ? 'Completed' : 'Pending'
                            }`}
                            title={
                              isCompletedGoal
                                ? `Goal concluded (${habit.finalAccuracy ?? percent}% final accuracy)`
                                : `Click to ${
                                    isCompleted ? 'unmark' : 'mark checkmark'
                                  } "${habit.title}" for Today`
                            }
                          >
                            {isToggling ? (
                              <span className="spreadsheet-loading-spinner" />
                            ) : isCompleted ? (
                              <svg
                                className="spreadsheet-check-svg"
                                viewBox="0 0 12 12"
                                width="12"
                                height="12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="2.5 6.5 5 9 9.5 3.5" />
                              </svg>
                            ) : null}
                          </button>
                        ) : (
                          /* Future Date inside active window: Disabled / Empty */
                          <div
                            className="spreadsheet-cell spreadsheet-cell--future"
                            title={`Future date in sprint (${day.dateStr})`}
                          >
                            <span className="spreadsheet-mark spreadsheet-mark--dim"></span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Right Column: Month / Sprint Accuracy Progress */}
                  <td className="spreadsheet-td-stats">
                    <div className="spreadsheet-stat-wrap">
                      <div className="spreadsheet-stat-info">
                        <span className="spreadsheet-stat-frac">
                          <strong>{completedCount}</strong>/{eligibleDays}
                        </span>
                        <span className="spreadsheet-stat-pct">{percent}%</span>
                      </div>
                      <div className="spreadsheet-stat-bar">
                        <div
                          className="spreadsheet-stat-bar__fill"
                          style={{
                            width: `${percent}%`,
                            background:
                              percent >= 80
                                ? 'var(--gradient-primary)'
                                : percent >= 50
                                ? 'var(--teal)'
                                : 'var(--amber)',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* 2. Blank Excel Spreadsheet Rows (Ready for Instant Typing) */}
            {blankRows.map((val, blankIdx) => {
              const rowNum = habits.length + blankIdx + 1;
              return (
                <tr
                  key={`blank-${blankIdx}`}
                  className="spreadsheet-row spreadsheet-row--blank"
                >
                  {/* Blank Habit Input Cell */}
                  <td className="spreadsheet-td-habit">
                    <div className="spreadsheet-habit-cell spreadsheet-habit-cell--blank">
                      <span className="spreadsheet-row-index spreadsheet-row-index--blank">
                        {rowNum}
                      </span>
                      <input
                        ref={(el) => (inputRefs.current[`blank-${blankIdx}`] = el)}
                        type="text"
                        className="spreadsheet-habit-input spreadsheet-habit-input--blank"
                        value={val}
                        onChange={(e) => handleBlankChange(blankIdx, e.target.value)}
                        onKeyDown={(e) => handleBlankKeyDown(e, blankIdx)}
                        onBlur={() => commitBlankRow(blankIdx, false)}
                        placeholder="Type new habit..."
                      />
                    </div>
                  </td>

                  {/* Blank Day Cells across the grid */}
                  {monthDays.map((day) => {
                    let cellClass = 'spreadsheet-td-day spreadsheet-td-day--blank';
                    if (day.isToday) cellClass += ' spreadsheet-col--today';
                    if (day.isWeekend) cellClass += ' spreadsheet-col--weekend';
                    if (day.isPreJoin) cellClass += ' spreadsheet-col--prejoin';

                    return (
                      <td key={day.dateStr} className={cellClass}>
                        <div className="spreadsheet-cell spreadsheet-cell--empty-grid" />
                      </td>
                    );
                  })}

                  {/* Empty Stats Cell */}
                  <td className="spreadsheet-td-stats spreadsheet-td-stats--blank">
                    <span className="spreadsheet-empty-dash">-</span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Row: Daily Team / Personal Completion Score */}
          <tfoot>
            <tr className="spreadsheet-footer-row">
              <td className="spreadsheet-td-habit spreadsheet-footer-label">
                <div className="spreadsheet-footer-title">
                  <span>DAILY TOTAL</span>
                  <span className="spreadsheet-footer-sub">Completed / Total</span>
                </div>
              </td>

              {monthDays.map((day, idx) => {
                const { total, completed, percent } = dailyStats[idx];
                let colClass = 'spreadsheet-td-day spreadsheet-footer-cell';
                if (day.isToday) colClass += ' spreadsheet-col--today';
                if (day.isWeekend) colClass += ' spreadsheet-col--weekend';
                if (day.isPreJoin) colClass += ' spreadsheet-col--prejoin';

                let badgeClass = 'spreadsheet-daily-badge--empty';
                if (!day.isPreJoin && !day.isFuture && total > 0) {
                  if (percent === 100) badgeClass = 'spreadsheet-daily-badge--perfect';
                  else if (percent >= 60) badgeClass = 'spreadsheet-daily-badge--good';
                  else if (percent > 0) badgeClass = 'spreadsheet-daily-badge--low';
                }

                return (
                  <td key={day.dateStr} className={colClass}>
                    {day.isPreJoin || day.isFuture ? (
                      <span className="spreadsheet-footer-dash">-</span>
                    ) : (
                      <div
                        className={`spreadsheet-daily-badge ${badgeClass}`}
                        title={`Day ${day.dayNum}: ${completed}/${total} done (${percent}%)`}
                      >
                        {completed}/{total}
                      </div>
                    )}
                  </td>
                );
              })}

              <td className="spreadsheet-td-stats spreadsheet-footer-total">
                <span className="spreadsheet-footer-total-text">MONTH TOTAL</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Spreadsheet Bottom Legend & Rules */}
      <div className="spreadsheet-legend">
        <div className="spreadsheet-legend__items">
          <span className="spreadsheet-legend__item">
            <span className="spreadsheet-legend-box spreadsheet-legend-box--today" />
            <strong>Today (Click to check ✓)</strong>
          </span>
          <span className="spreadsheet-legend__item">
            <span className="spreadsheet-legend-box spreadsheet-legend-box--completed" />
            <strong>Completed ✓</strong>
          </span>
          <span className="spreadsheet-legend__item">
            <span className="spreadsheet-legend-box spreadsheet-legend-box--locked" />
            <strong>Past Days (Locked)</strong>
          </span>
          <span className="spreadsheet-legend__item">
            <span className="spreadsheet-legend-box spreadsheet-legend-box--future" />
            <strong>Future Days (Disabled)</strong>
          </span>
        </div>
        <div className="spreadsheet-legend__rules">
          <span>Only today&apos;s date can be checked to ensure authentic streak records.</span>
        </div>
      </div>
    </div>
  );
}
