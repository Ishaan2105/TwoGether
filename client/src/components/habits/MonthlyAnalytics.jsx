import { useMemo } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MonthlyAnalytics({
  habits = [],
  selectedYear,
  selectedMonth,
  todayStr,
  joinDateStr,
}) {
  const monthName = MONTH_NAMES[selectedMonth];
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Is this the current active month?
  const isCurrentMonth = useMemo(() => {
    const d = new Date();
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  }, [selectedYear, selectedMonth]);

  // Computed Analytics Data
  const analytics = useMemo(() => {
    if (!habits || habits.length === 0) return null;

    let totalEligibleCheckins = 0;
    let totalCompletedCheckins = 0;
    let perfectDaysCount = 0;

    // Daily breakdown across the month
    const dailyMap = {};
    const weekdayTotals = { 0: { done: 0, total: 0 }, 1: { done: 0, total: 0 }, 2: { done: 0, total: 0 }, 3: { done: 0, total: 0 }, 4: { done: 0, total: 0 }, 5: { done: 0, total: 0 }, 6: { done: 0, total: 0 } };

    for (let d = 1; d <= daysInMonth; d++) {
      const dayPadded = String(d).padStart(2, '0');
      const mPadded = String(selectedMonth + 1).padStart(2, '0');
      const dateStr = `${selectedYear}-${mPadded}-${dayPadded}`;
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const dayOfWeek = dateObj.getDay();

      const isPreJoin = joinDateStr ? dateStr < joinDateStr : false;
      const isFuture = dateStr > todayStr;

      if (isPreJoin || isFuture) continue;

      let completedOnDay = 0;
      let activeHabitsOnDay = 0;

      habits.forEach((h) => {
        const start = h.startDate || h.createdAt?.slice(0, 10);
        const end = h.endDate || null;

        if (start && dateStr < start) return;
        if (end && dateStr > end) return;

        activeHabitsOnDay++;
        totalEligibleCheckins++;

        if ((h.completedDates || []).includes(dateStr)) {
          completedOnDay++;
          totalCompletedCheckins++;
        }
      });

      if (completedOnDay === activeHabitsOnDay && activeHabitsOnDay > 0) {
        perfectDaysCount++;
      }

      dailyMap[dateStr] = {
        dayNum: d,
        dateStr,
        dayOfWeek,
        completed: completedOnDay,
        total: activeHabitsOnDay,
        percent: activeHabitsOnDay > 0 ? Math.round((completedOnDay / activeHabitsOnDay) * 100) : 0,
      };

      weekdayTotals[dayOfWeek].done += completedOnDay;
      weekdayTotals[dayOfWeek].total += activeHabitsOnDay;
    }

    // Overall Consistency Score
    const overallEfficiency =
      totalEligibleCheckins > 0
        ? Math.round((totalCompletedCheckins / totalEligibleCheckins) * 100)
        : 0;

    // Week-by-Week Breakdown
    const weeks = [
      { name: 'Week 1', range: 'Days 1 – 7', start: 1, end: 7 },
      { name: 'Week 2', range: 'Days 8 – 14', start: 8, end: 14 },
      { name: 'Week 3', range: 'Days 15 – 21', start: 15, end: 21 },
      { name: 'Week 4', range: 'Days 22 – 28', start: 22, end: 28 },
    ];
    if (daysInMonth > 28) {
      weeks.push({
        name: 'Week 5',
        range: `Days 29 – ${daysInMonth}`,
        start: 29,
        end: daysInMonth,
      });
    }

    let prevWeekPercent = null;
    const weeklyBreakdown = weeks.map((w) => {
      let weekEligible = 0;
      let weekDone = 0;

      for (let d = w.start; d <= Math.min(w.end, daysInMonth); d++) {
        const dayPadded = String(d).padStart(2, '0');
        const mPadded = String(selectedMonth + 1).padStart(2, '0');
        const dateStr = `${selectedYear}-${mPadded}-${dayPadded}`;

        if (dailyMap[dateStr]) {
          weekDone += dailyMap[dateStr].completed;
          weekEligible += dailyMap[dateStr].total;
        }
      }

      const weekPercent = weekEligible > 0 ? Math.round((weekDone / weekEligible) * 100) : 0;
      const isPastOrCurrent = weekEligible > 0;

      let trend = null;
      if (prevWeekPercent !== null && isPastOrCurrent) {
        const diff = weekPercent - prevWeekPercent;
        if (diff > 0) trend = { text: `+${diff}% vs prev week`, direction: 'up' };
        else if (diff < 0) trend = { text: `${diff}% vs prev week`, direction: 'down' };
        else trend = { text: `Equal to prev week`, direction: 'neutral' };
      }
      if (isPastOrCurrent) {
        prevWeekPercent = weekPercent;
      }

      let badge = 'In Progress';
      let badgeClass = 'badge--subtle';
      if (weekPercent >= 90) {
        badge = 'Flawless';
        badgeClass = 'badge--success';
      } else if (weekPercent >= 75) {
        badge = 'High Output';
        badgeClass = 'badge--pill';
      } else if (weekPercent >= 50) {
        badge = 'Steady';
        badgeClass = 'badge--warning';
      } else if (isPastOrCurrent) {
        badge = 'Needs Focus';
        badgeClass = 'badge--danger';
      }

      return {
        ...w,
        done: weekDone,
        eligible: weekEligible,
        percent: weekPercent,
        isPastOrCurrent,
        trend,
        badge,
        badgeClass,
      };
    });

    // Time-Bounded Sprint Missions & Goals Analytics
    const sprintHabits = habits
      .filter((h) => h.habitType === 'sprint')
      .map((h) => {
        const start = h.startDate || h.createdAt?.slice(0, 10) || todayStr;
        const end = h.endDate || null;
        let validCompleted = 0;
        let elapsedDays = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dayPadded = String(d).padStart(2, '0');
          const mPadded = String(selectedMonth + 1).padStart(2, '0');
          const dateStr = `${selectedYear}-${mPadded}-${dayPadded}`;

          if (dateStr < start) continue;
          if (end && dateStr > end) continue;
          if (dateStr > todayStr) continue;

          elapsedDays++;
          if ((h.completedDates || []).includes(dateStr)) {
            validCompleted++;
          }
        }

        const targetDays = h.targetDays || elapsedDays || 5;
        const accuracyPct =
          h.status === 'completed' && h.finalAccuracy !== undefined
            ? h.finalAccuracy
            : elapsedDays > 0
            ? Math.round((validCompleted / elapsedDays) * 100)
            : 0;

        let daysRemaining = 0;
        if (end && todayStr <= end) {
          const diffMs = new Date(end) - new Date(todayStr);
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        return {
          ...h,
          start,
          end,
          targetDays,
          elapsedDays,
          validCompleted,
          accuracyPct,
          daysRemaining,
          isConcluded: h.status === 'completed',
        };
      });

    // Habit Performance Ranking (MVP vs Area of Improvement)
    const habitStats = habits.map((h) => {
      let done = 0;
      let eligible = 0;
      const start = h.startDate || h.createdAt?.slice(0, 10);
      const end = h.endDate || null;

      for (let d = 1; d <= daysInMonth; d++) {
        const dayPadded = String(d).padStart(2, '0');
        const mPadded = String(selectedMonth + 1).padStart(2, '0');
        const dateStr = `${selectedYear}-${mPadded}-${dayPadded}`;

        if (start && dateStr < start) continue;
        if (end && dateStr > end) continue;

        if (dailyMap[dateStr]) {
          eligible++;
          if ((h.completedDates || []).includes(dateStr)) {
            done++;
          }
        }
      }

      const percent =
        h.status === 'completed' && h.finalAccuracy !== undefined
          ? h.finalAccuracy
          : eligible > 0
          ? Math.round((done / eligible) * 100)
          : 0;

      return {
        ...h,
        done,
        eligible,
        percent,
      };
    });

    habitStats.sort((a, b) => b.percent - a.percent);
    const mvpHabit = habitStats[0] || null;
    const improvementHabit =
      habitStats.length > 1 ? habitStats[habitStats.length - 1] : null;

    // Day of Week Performance
    const weekdayStats = [1, 2, 3, 4, 5, 6, 0].map((idx) => {
      const { done, total } = weekdayTotals[idx];
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        dayName: WEEKDAY_NAMES[idx],
        shortName: WEEKDAY_NAMES[idx].slice(0, 3),
        done,
        total,
        percent,
        isWeekend: idx === 0 || idx === 6,
      };
    });

    const bestDay = [...weekdayStats].sort((a, b) => b.percent - a.percent)[0];
    const toughestDay = [...weekdayStats].sort((a, b) => a.percent - b.percent)[0];

    return {
      overallEfficiency,
      totalCompletedCheckins,
      totalEligibleCheckins,
      perfectDaysCount,
      totalXP: totalCompletedCheckins * 15,
      weeklyBreakdown,
      sprintHabits,
      mvpHabit,
      improvementHabit,
      weekdayStats,
      bestDay,
      toughestDay,
    };
  }, [habits, selectedYear, selectedMonth, daysInMonth, todayStr, joinDateStr]);

  if (!analytics) return null;

  return (
    <section className="analytics-section">
      {/* Header Banner */}
      <div className="analytics-header">
        <div>
          <div className="analytics-badge">
            <span>MONTHLY INTELLIGENCE REPORT</span>
            <span className="analytics-period">
              {monthName} {selectedYear}
            </span>
          </div>
          <h2 className="analytics-title">
            Productivity & Streak Diagnostics
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Deep analysis of your habit consistency across weeks, days, and individual routines.
          </p>
        </div>

        {/* Big Overall Efficiency Score Gauge */}
        <div className="analytics-score-card">
          <div className="analytics-ring-gauge">
            <svg className="analytics-ring-svg" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
              <defs>
                <linearGradient id="analyticsRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--cyan)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <circle
                className="analytics-ring-track"
                cx="38"
                cy="38"
                r="30"
                strokeWidth="6"
                fill="none"
              />
              <circle
                className="analytics-ring-progress"
                cx="38"
                cy="38"
                r="30"
                strokeWidth="6"
                fill="none"
                stroke="url(#analyticsRingGrad)"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={
                  2 * Math.PI * 30 * (1 - Math.min(100, Math.max(0, analytics.overallEfficiency)) / 100)
                }
                strokeLinecap="round"
                transform="rotate(-90 38 38)"
              />
            </svg>
            <div className="analytics-ring-center">
              <span className="analytics-score-num">{analytics.overallEfficiency}%</span>
            </div>
          </div>
          <div className="analytics-score-info">
            <span className="analytics-score-label">MONTHLY EFFICIENCY</span>
            <span className="analytics-score-sub">
              {analytics.totalCompletedCheckins} / {analytics.totalEligibleCheckins} completed
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="analytics-kpis">
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-info">
            <span className="analytics-kpi-label">TOTAL CHECK-INS</span>
            <strong className="analytics-kpi-value">
              {analytics.totalCompletedCheckins}
              <small className="muted"> / {analytics.totalEligibleCheckins}</small>
            </strong>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-info">
            <span className="analytics-kpi-label">XP GENERATED</span>
            <strong className="analytics-kpi-value">+{analytics.totalXP} XP</strong>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-info">
            <span className="analytics-kpi-label">PERFECT DAYS (100%)</span>
            <strong className="analytics-kpi-value">{analytics.perfectDaysCount} Days</strong>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-info">
            <span className="analytics-kpi-label">ACTIVE HABITS</span>
            <strong className="analytics-kpi-value">{habits.length} Routines</strong>
          </div>
        </div>
      </div>

      {/* Grid: Weekly Breakdown & Strengths/Areas of Improvement */}
      <div className="analytics-grid-two">
        {/* Left: Week-by-Week Progress Cards */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h3>Week-by-Week Consistency</h3>
            <span className="badge badge--pill">WEEKLY EFFICIENCY</span>
          </div>

          <div className="analytics-weeks-list">
            {analytics.weeklyBreakdown.map((w) => (
              <div
                key={w.name}
                className={`analytics-week-row ${
                  !w.isPastOrCurrent ? 'analytics-week-row--upcoming' : ''
                }`}
              >
                <div className="analytics-week-info">
                  <div className="analytics-week-title-row">
                    <strong>{w.name}</strong>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      ({w.range})
                    </span>
                    {w.isPastOrCurrent && (
                      <span className={`badge ${w.badgeClass}`}>{w.badge}</span>
                    )}
                  </div>
                  {w.trend && (
                    <span
                      className={`analytics-week-trend analytics-week-trend--${w.trend.direction}`}
                    >
                      {w.trend.direction === 'up' ? '▲' : w.trend.direction === 'down' ? '▼' : '●'}{' '}
                      {w.trend.text}
                    </span>
                  )}
                </div>

                <div className="analytics-week-metric">
                  <div className="analytics-week-pct-row">
                    <span className="analytics-week-done">
                      {w.done}/{w.eligible} tasks
                    </span>
                    <strong className="analytics-week-pct">
                      {w.isPastOrCurrent ? `${w.percent}%` : 'Upcoming'}
                    </strong>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{
                        width: `${w.percent}%`,
                        background:
                          w.percent >= 80
                            ? 'var(--gradient-primary)'
                            : w.percent >= 60
                            ? 'var(--teal)'
                            : 'var(--amber)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: MVP Habit vs Area of Improvement & Day of Week */}
        <div className="analytics-right-stack">
          {/* Top Habit (MVP) */}
          {analytics.mvpHabit && (
            <div className="analytics-card analytics-card--mvp">
              <div className="analytics-card__header">
                <div className="analytics-mvp-tag">
                  <span>#1 MOST CONSISTENT HABIT (MVP)</span>
                </div>
                <span className="analytics-mvp-pct">{analytics.mvpHabit.percent}% Done</span>
              </div>

              <div className="analytics-habit-highlight">
                <span className="analytics-habit-icon">{analytics.mvpHabit.icon || '🎯'}</span>
                <div className="analytics-habit-text">
                  <h4>{analytics.mvpHabit.title}</h4>
                  <p className="muted">
                    Completed <strong>{analytics.mvpHabit.done}</strong> out of{' '}
                    <strong>{analytics.mvpHabit.eligible}</strong> days this month. Current streak:{' '}
                    <strong>{analytics.mvpHabit.currentStreak} days</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Area of Improvement */}
          {analytics.improvementHabit && analytics.improvementHabit._id !== analytics.mvpHabit?._id && (
            <div className="analytics-card analytics-card--improve">
              <div className="analytics-card__header">
                <div className="analytics-improve-tag">
                  <span>TOP AREA FOR IMPROVEMENT</span>
                </div>
                <span className="analytics-improve-pct">
                  {analytics.improvementHabit.percent}% Done
                </span>
              </div>

              <div className="analytics-habit-highlight">
                <span className="analytics-habit-icon">
                  {analytics.improvementHabit.icon || '🎯'}
                </span>
                <div className="analytics-habit-text">
                  <h4>{analytics.improvementHabit.title}</h4>
                  <p className="muted">
                    Completed <strong>{analytics.improvementHabit.done}</strong> of{' '}
                    <strong>{analytics.improvementHabit.eligible}</strong> days.
                  </p>
                </div>
              </div>

              <div className="analytics-coaching-tip">
                <p>
                  <strong>Smart Strategy:</strong> Try &ldquo;Habit Stacking&rdquo;—perform{' '}
                  <em>{analytics.improvementHabit.title}</em> immediately after completing{' '}
                  <em>{analytics.mvpHabit?.title || 'your morning routine'}</em> to build momentum.
                </p>
              </div>
            </div>
          )}

          {/* Weekday Consistency Heatmap Bar */}
          <div className="analytics-card">
            <div className="analytics-card__header">
              <h3>Day-of-Week Rhythm</h3>
              <span className="muted" style={{ fontSize: '0.75rem' }}>
                Best: <strong>{analytics.bestDay?.dayName}</strong> ({analytics.bestDay?.percent}%)
              </span>
            </div>

            <div className="analytics-weekday-grid">
              {analytics.weekdayStats.map((d) => (
                <div
                  key={d.dayName}
                  className={`analytics-weekday-col ${
                    d.isWeekend ? 'analytics-weekday-col--weekend' : ''
                  }`}
                  title={`${d.dayName}: ${d.done}/${d.total} check-ins (${d.percent}%)`}
                >
                  <span className="analytics-weekday-bar-wrap">
                    <span
                      className="analytics-weekday-bar-fill"
                      style={{
                        height: `${Math.max(8, d.percent)}%`,
                        background:
                          d.percent >= 80
                            ? 'var(--cyan)'
                            : d.percent >= 60
                            ? 'var(--teal)'
                            : 'var(--amber)',
                      }}
                    />
                  </span>
                  <span className="analytics-weekday-pct">{d.percent}%</span>
                  <span className="analytics-weekday-name">{d.shortName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time-Bounded Sprint Goals & Missions Diagnostic Section */}
      <div className="analytics-card analytics-sprint-section">
        <div className="analytics-card__header">
          <div>
            <div className="analytics-badge" style={{ marginBottom: '0.2rem' }}>
              <span>SPRINT MISSIONS & EXAM PREP</span>
            </div>
            <h3 style={{ margin: 0 }}>Time-Bounded Goal Tracking</h3>
          </div>
          <span className="badge badge--pill">
            {analytics.sprintHabits.length} {analytics.sprintHabits.length === 1 ? 'Sprint Goal' : 'Sprint Goals'}
          </span>
        </div>

        {analytics.sprintHabits.length > 0 ? (
          <div className="analytics-sprints-grid">
            {analytics.sprintHabits.map((sprint) => (
              <div
                key={sprint._id}
                className={`analytics-sprint-item ${
                  sprint.isConcluded ? 'analytics-sprint-item--concluded' : ''
                }`}
              >
                <div className="analytics-sprint-item__top">
                  <div className="analytics-sprint-item__title-group">
                    <span className="analytics-sprint-item__icon">{sprint.icon || '🎯'}</span>
                    <div>
                      <h4 className="analytics-sprint-item__title">{sprint.title}</h4>
                      <span className="analytics-sprint-item__dates">
                        {sprint.start} → {sprint.end || 'Open-ended'}
                      </span>
                    </div>
                  </div>

                  <div className="analytics-sprint-item__badge-wrap">
                    {sprint.isConcluded ? (
                      <span className="badge badge--success">
                        Concluded ✓ ({sprint.accuracyPct}% Accuracy)
                      </span>
                    ) : (
                      <span className="badge badge--pill">
                        {sprint.daysRemaining > 0
                          ? `${sprint.daysRemaining}d remaining`
                          : 'In Progress'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Accuracy & Progress Metrics */}
                <div className="analytics-sprint-item__metrics">
                  <div className="analytics-sprint-metric-col">
                    <span className="analytics-sprint-label">ACCURACY</span>
                    <strong
                      className="analytics-sprint-value"
                      style={{
                        color:
                          sprint.accuracyPct >= 80
                            ? 'var(--cyan)'
                            : sprint.accuracyPct >= 50
                            ? 'var(--amber)'
                            : 'var(--text)',
                      }}
                    >
                      {sprint.accuracyPct}%
                    </strong>
                  </div>

                  <div className="analytics-sprint-metric-col">
                    <span className="analytics-sprint-label">CHECK-INS</span>
                    <strong className="analytics-sprint-value">
                      {sprint.validCompleted} / {sprint.elapsedDays || sprint.targetDays}
                    </strong>
                  </div>

                  <div className="analytics-sprint-metric-col">
                    <span className="analytics-sprint-label">TARGET</span>
                    <strong className="analytics-sprint-value">{sprint.targetDays} Days</strong>
                  </div>
                </div>

                {/* Sprint Progress Bar */}
                <div className="progress-bar" style={{ height: '7px', marginTop: '0.5rem' }}>
                  <div
                    className="progress-bar__fill"
                    style={{
                      width: `${Math.min(100, Math.max(5, sprint.accuracyPct))}%`,
                      background:
                        sprint.accuracyPct >= 80
                          ? 'var(--gradient-primary)'
                          : sprint.accuracyPct >= 50
                          ? 'var(--teal)'
                          : 'var(--amber)',
                    }}
                  />
                </div>

                {/* Reflection Note & Rewards */}
                {sprint.objectiveNote && (
                  <div className="analytics-sprint-note">
                    <span className="analytics-sprint-note-label">Outcome / Reflection:</span>
                    <p className="analytics-sprint-note-text">
                      &ldquo;{sprint.objectiveNote}&rdquo;
                    </p>
                  </div>
                )}

                {sprint.isConcluded && sprint.accuracyPct >= 80 && (
                  <div className="analytics-sprint-bonus">
                    <span>+50 XP Goal Mastery Bonus Earned</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="analytics-sprint-empty">
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              No active or concluded sprints yet. You can create a 3-day, 5-day (exam prep), or 14-day time-bounded goal whenever you want to track a high-focus objective without long-term streak pressure.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
