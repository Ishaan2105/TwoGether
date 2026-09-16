import { useState, useMemo } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Analytics 11 - Cohort Retention & Habit Consistency Matrix
 * Features:
 * - Pinned cohort labels with sticky header and left columns
 * - Value-driven heatmap cell shading with dynamic contrast
 * - Multi-view toggles: Weekly Cohorts, Category Cohorts, and Habit Retention
 * - Real-time habit check-in data aggregation
 * - Responsive horizontal scroll with interactive cell insights
 */
export default function CohortRetentionMatrix({
  habits = [],
  selectedYear,
  selectedMonth,
  todayStr,
  joinDateStr,
}) {
  const [cohortView, setCohortView] = useState('weekly'); // 'weekly' | 'category' | 'habit'
  const [hoveredCell, setHoveredCell] = useState(null);

  const monthName = MONTH_NAMES[selectedMonth];
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Define the 4-5 weekly periods in the month
  const periods = useMemo(() => {
    const list = [
      { id: 'w1', label: 'Wk 1 (1–7)', startDay: 1, endDay: 7 },
      { id: 'w2', label: 'Wk 2 (8–14)', startDay: 8, endDay: 14 },
      { id: 'w3', label: 'Wk 3 (15–21)', startDay: 15, endDay: 21 },
      { id: 'w4', label: 'Wk 4 (22–28)', startDay: 22, endDay: 28 },
    ];
    if (daysInMonth > 28) {
      list.push({ id: 'w5', label: `Wk 5 (29–${daysInMonth})`, startDay: 29, endDay: daysInMonth });
    }
    return list;
  }, [daysInMonth]);

  // Compute check-ins for a set of habits in a specific day range
  const computePeriodCheckins = (habitList, startDay, endDay) => {
    let completed = 0;
    let eligible = 0;

    for (let d = startDay; d <= endDay; d++) {
      const dPad = String(d).padStart(2, '0');
      const mPad = String(selectedMonth + 1).padStart(2, '0');
      const dateStr = `${selectedYear}-${mPad}-${dPad}`;

      const isPreJoin = joinDateStr ? dateStr < joinDateStr : false;
      const isFuture = dateStr > todayStr;
      if (isPreJoin || isFuture) continue;

      habitList.forEach((h) => {
        const hStart = h.startDate || h.createdAt?.slice(0, 10);
        const hEnd = h.endDate || null;

        if (hStart && dateStr < hStart) return;
        if (hEnd && dateStr > hEnd) return;

        eligible++;
        if ((h.completedDates || []).includes(dateStr)) {
          completed++;
        }
      });
    }

    const rate = eligible > 0 ? (completed / eligible) * 100 : null;
    return { completed, eligible, rate };
  };

  // 1. Weekly Cohorts Matrix Data
  const weeklyCohortData = useMemo(() => {
    if (!habits || habits.length === 0) return [];

    return periods.map((cohortPeriod, cohortIdx) => {
      // Habits active during this cohort starting week
      const cohortHabits = habits.filter((h) => {
        const start = h.startDate || h.createdAt?.slice(0, 10);
        const mPad = String(selectedMonth + 1).padStart(2, '0');
        const cohortStartDate = `${selectedYear}-${mPad}-${String(cohortPeriod.startDay).padStart(2, '0')}`;
        if (h.endDate && h.endDate < cohortStartDate) return false;
        if (start && start > `${selectedYear}-${mPad}-${String(cohortPeriod.endDay).padStart(2, '0')}`) return false;
        return true;
      });

      // Compute retention for each subsequent period (Period 0, Period +1, Period +2...)
      const cells = periods.map((targetPeriod, targetIdx) => {
        if (targetIdx < cohortIdx) {
          // Historical period before cohort creation -> N/A
          return { isBefore: true, rate: null, completed: 0, eligible: 0 };
        }

        const stats = computePeriodCheckins(cohortHabits, targetPeriod.startDay, targetPeriod.endDay);
        return {
          isBefore: false,
          rate: stats.rate,
          completed: stats.completed,
          eligible: stats.eligible,
          offsetLabel: targetIdx === cohortIdx ? 'Base (Wk 0)' : `+${targetIdx - cohortIdx} Wk`,
        };
      });

      const baseCheckins = cells[cohortIdx]?.eligible || 0;

      return {
        id: cohortPeriod.id,
        name: `Cohort ${cohortPeriod.label}`,
        baseSize: `${cohortHabits.length} habits`,
        baseCheckins,
        cells,
      };
    });
  }, [habits, periods, selectedYear, selectedMonth, todayStr, joinDateStr]);

  // 2. Category Cohorts Matrix Data
  const categoryCohortData = useMemo(() => {
    if (!habits || habits.length === 0) return [];

    const categories = ['Fitness', 'Focus', 'Health', 'Productivity', 'Mindset'];
    const activeCategories = categories.filter((cat) =>
      habits.some((h) => (h.category || '').toLowerCase() === cat.toLowerCase())
    );

    const targetCats = activeCategories.length > 0 ? activeCategories : categories;

    return targetCats.map((cat) => {
      const catHabits = habits.filter(
        (h) => (h.category || '').toLowerCase() === cat.toLowerCase()
      );

      const cells = periods.map((targetPeriod) => {
        const stats = computePeriodCheckins(catHabits, targetPeriod.startDay, targetPeriod.endDay);
        return {
          isBefore: false,
          rate: stats.rate,
          completed: stats.completed,
          eligible: stats.eligible,
          offsetLabel: targetPeriod.label,
        };
      });

      const totalEligible = cells.reduce((acc, c) => acc + (c.eligible || 0), 0);

      return {
        id: cat,
        name: `${cat} Habits`,
        baseSize: `${catHabits.length} active`,
        baseCheckins: totalEligible,
        cells,
      };
    });
  }, [habits, periods, selectedYear, selectedMonth, todayStr, joinDateStr]);

  // 3. Habit-Level Matrix Data
  const habitCohortData = useMemo(() => {
    if (!habits || habits.length === 0) return [];

    return habits.map((habit) => {
      const cells = periods.map((targetPeriod) => {
        const stats = computePeriodCheckins([habit], targetPeriod.startDay, targetPeriod.endDay);
        return {
          isBefore: false,
          rate: stats.rate,
          completed: stats.completed,
          eligible: stats.eligible,
          offsetLabel: targetPeriod.label,
        };
      });

      const totalEligible = cells.reduce((acc, c) => acc + (c.eligible || 0), 0);

      return {
        id: habit._id,
        name: habit.title,
        icon: habit.icon || '⚡',
        baseSize: habit.habitType === 'sprint' ? 'Sprint Goal' : 'Daily Routine',
        baseCheckins: totalEligible,
        cells,
      };
    });
  }, [habits, periods, selectedYear, selectedMonth, todayStr, joinDateStr]);

  // Active matrix dataset based on current tab
  const activeMatrix = useMemo(() => {
    if (cohortView === 'category') return categoryCohortData;
    if (cohortView === 'habit') return habitCohortData;
    return weeklyCohortData;
  }, [cohortView, weeklyCohortData, categoryCohortData, habitCohortData]);

  // Global Cohort Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalEligible = 0;
    let totalCompleted = 0;
    let rates = [];

    activeMatrix.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.rate !== null && !cell.isBefore) {
          rates.push(cell.rate);
          totalEligible += cell.eligible;
          totalCompleted += cell.completed;
        }
      });
    });

    const avgRetention =
      totalEligible > 0 ? Math.round((totalCompleted / totalEligible) * 100) : 0;

    // Best performing cohort
    let bestCohort = '—';
    let bestAvg = -1;

    activeMatrix.forEach((row) => {
      const validCells = row.cells.filter((c) => c.rate !== null && !c.isBefore);
      if (validCells.length > 0) {
        const rowAvg =
          validCells.reduce((sum, c) => sum + c.rate, 0) / validCells.length;
        if (rowAvg > bestAvg) {
          bestAvg = rowAvg;
          bestCohort = row.name;
        }
      }
    });

    // Week 1 vs Latest Week Retention Velocity
    const w1Cells = activeMatrix.map((r) => r.cells[0]).filter((c) => c && c.rate !== null);
    const w1Avg = w1Cells.length > 0 ? w1Cells.reduce((a, b) => a + b.rate, 0) / w1Cells.length : 0;

    const latestIdx = periods.length - 1;
    const latestCells = activeMatrix.map((r) => r.cells[latestIdx]).filter((c) => c && c.rate !== null);
    const latestAvg = latestCells.length > 0 ? latestCells.reduce((a, b) => a + b.rate, 0) / latestCells.length : w1Avg;

    const velocityDelta = Math.round(latestAvg - w1Avg);

    return {
      avgRetention,
      totalCompleted,
      totalEligible,
      bestCohort,
      velocityDelta,
    };
  }, [activeMatrix, periods]);

  // Helper to compute value-driven shading style
  const getShadingStyle = (rate, isBefore) => {
    if (isBefore || rate === null) {
      return {
        background: 'transparent',
        color: 'var(--text-dim)',
      };
    }

    // Value-driven dynamic shading scaled with theme cyan/emerald tokens
    if (rate >= 90) {
      return {
        background: 'rgba(var(--cyan-rgb), 0.92)',
        color: 'var(--btn-primary-text)',
        fontWeight: '800',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
      };
    }
    if (rate >= 75) {
      return {
        background: 'rgba(var(--cyan-rgb), 0.65)',
        color: '#ffffff',
        fontWeight: '700',
      };
    }
    if (rate >= 50) {
      return {
        background: 'rgba(var(--cyan-rgb), 0.40)',
        color: 'var(--text)',
        fontWeight: '600',
      };
    }
    if (rate >= 25) {
      return {
        background: 'rgba(var(--cyan-rgb), 0.20)',
        color: 'var(--text)',
        fontWeight: '600',
      };
    }
    if (rate > 0) {
      return {
        background: 'rgba(var(--cyan-rgb), 0.08)',
        color: 'var(--text-muted)',
      };
    }
    // 0% check-ins
    return {
      background: 'rgba(239, 68, 68, 0.08)',
      color: '#f87171',
    };
  };

  return (
    <section className="cohort-matrix-block" aria-label="Cohort Retention Analytics">
      {/* Block Header & Mode Switcher */}
      <div className="cohort-matrix-header">
        <div className="cohort-matrix-header__left">
          <h3 className="cohort-matrix-title">
            {monthName} {selectedYear} Consistency & Retention Matrix
          </h3>
          <p className="cohort-matrix-sub">
            Pinned cohort labels with value-driven dynamic shading to track habit retention and drop-off rates across weekly windows.
          </p>
        </div>

        <div className="cohort-matrix-header__right">
          <div className="cohort-view-switcher" role="tablist">
            <button
              type="button"
              className={`cohort-view-btn ${cohortView === 'weekly' ? 'cohort-view-btn--active' : ''}`}
              onClick={() => setCohortView('weekly')}
              role="tab"
              aria-selected={cohortView === 'weekly'}
            >
              Weekly Cohorts
            </button>
            <button
              type="button"
              className={`cohort-view-btn ${cohortView === 'category' ? 'cohort-view-btn--active' : ''}`}
              onClick={() => setCohortView('category')}
              role="tab"
              aria-selected={cohortView === 'category'}
            >
              Categories
            </button>
            <button
              type="button"
              className={`cohort-view-btn ${cohortView === 'habit' ? 'cohort-view-btn--active' : ''}`}
              onClick={() => setCohortView('habit')}
              role="tab"
              aria-selected={cohortView === 'habit'}
            >
              By Habit
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="cohort-summary-grid">
        <div className="cohort-summary-card">
          <span className="cohort-summary-card__label">AVERAGE RETENTION</span>
          <div className="cohort-summary-card__value-wrap">
            <span className="cohort-summary-card__value">{summaryMetrics.avgRetention}%</span>
            <span className={`cohort-delta-pill ${summaryMetrics.avgRetention >= 70 ? 'cohort-delta-pill--positive' : ''}`}>
              {summaryMetrics.avgRetention >= 70 ? 'Optimal' : 'Needs Focus'}
            </span>
          </div>
          <small className="cohort-summary-card__hint">
            {summaryMetrics.totalCompleted} completed of {summaryMetrics.totalEligible} planned check-ins
          </small>
        </div>

        <div className="cohort-summary-card">
          <span className="cohort-summary-card__label">TOP PERFORMING COHORT</span>
          <div className="cohort-summary-card__value-wrap">
            <span className="cohort-summary-card__value cohort-summary-card__value--highlight">
              {summaryMetrics.bestCohort}
            </span>
          </div>
          <small className="cohort-summary-card__hint">Highest sustained completion rate this month</small>
        </div>

        <div className="cohort-summary-card">
          <span className="cohort-summary-card__label">RETENTION VELOCITY</span>
          <div className="cohort-summary-card__value-wrap">
            <span className="cohort-summary-card__value">
              {summaryMetrics.velocityDelta >= 0 ? `+${summaryMetrics.velocityDelta}%` : `${summaryMetrics.velocityDelta}%`}
            </span>
            <span className={`cohort-delta-pill ${summaryMetrics.velocityDelta >= 0 ? 'cohort-delta-pill--positive' : 'cohort-delta-pill--warning'}`}>
              {summaryMetrics.velocityDelta >= 0 ? '↑ Accelerating' : '↓ Slower'}
            </span>
          </div>
          <small className="cohort-summary-card__hint">Progression from Week 1 to latest week</small>
        </div>
      </div>

      {/* The Cohort Retention Matrix Table */}
      <div className="cohort-table-container">
        <table className="cohort-table" aria-label="Cohort Retention Table">
          <thead>
            <tr className="cohort-tr-head">
              {/* Pinned Left Header */}
              <th className="cohort-th-pinned">
                <div className="cohort-th-pinned__inner">
                  <span>COHORT GROUP</span>
                  <span className="cohort-th-pinned__size">BASE TARGET</span>
                </div>
              </th>

              {/* Incremental Period Columns */}
              {periods.map((p, idx) => (
                <th key={p.id} className="cohort-th-period">
                  <div className="cohort-th-period__content">
                    <span className="cohort-period-label">{cohortView === 'weekly' ? (idx === 0 ? 'Wk 0 (Base)' : `+${idx} Wk`) : p.label}</span>
                    <span className="cohort-period-range">{p.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activeMatrix.map((row) => (
              <tr key={row.id} className="cohort-tr-row">
                {/* Pinned Left Label Column */}
                <td className="cohort-td-pinned">
                  <div className="cohort-pinned-cell">
                    {row.icon && <span className="cohort-pinned-icon">{row.icon}</span>}
                    <div className="cohort-pinned-info">
                      <strong className="cohort-pinned-name" title={row.name}>
                        {row.name}
                      </strong>
                      <span className="cohort-pinned-sub">
                        {row.baseSize} · {row.baseCheckins} check-ins
                      </span>
                    </div>
                  </div>
                </td>

                {/* Shaded Value Cells */}
                {row.cells.map((cell, colIdx) => {
                  const style = getShadingStyle(cell.rate, cell.isBefore);

                  if (cell.isBefore) {
                    return (
                      <td key={colIdx} className="cohort-td-cell cohort-td-cell--empty">
                        <div className="cohort-cell-box cohort-cell-box--empty">
                          <span>—</span>
                        </div>
                      </td>
                    );
                  }

                  if (cell.rate === null) {
                    return (
                      <td key={colIdx} className="cohort-td-cell cohort-td-cell--future">
                        <div className="cohort-cell-box cohort-cell-box--future" title="Future Period">
                          <span>·</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={colIdx}
                      className="cohort-td-cell"
                      onMouseEnter={() =>
                        setHoveredCell({
                          cohortName: row.name,
                          periodLabel: periods[colIdx].label,
                          offsetLabel: cell.offsetLabel,
                          rate: Math.round(cell.rate),
                          completed: cell.completed,
                          eligible: cell.eligible,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className="cohort-cell-box" style={style}>
                        <span className="cohort-cell-rate">{Math.round(cell.rate)}%</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Interactive Hover Tooltip & Legend Bar */}
      <div className="cohort-matrix-footer">
        <div className="cohort-legend">
          <span className="cohort-legend__title">SHADING SCALE:</span>
          <div className="cohort-legend__scale">
            <span className="cohort-legend-chip cohort-legend-chip--0">0%</span>
            <span className="cohort-legend-chip cohort-legend-chip--25">25%</span>
            <span className="cohort-legend-chip cohort-legend-chip--50">50%</span>
            <span className="cohort-legend-chip cohort-legend-chip--75">75%</span>
            <span className="cohort-legend-chip cohort-legend-chip--100">100%</span>
          </div>
        </div>

        {hoveredCell ? (
          <div className="cohort-hover-insight">
            <strong>{hoveredCell.cohortName}</strong> · {hoveredCell.offsetLabel} ({hoveredCell.periodLabel}):{' '}
            <span className="cohort-hover-highlight">
              {hoveredCell.rate}% ({hoveredCell.completed}/{hoveredCell.eligible} completed)
            </span>
          </div>
        ) : (
          <div className="cohort-hover-hint">
            💡 Hover over any shaded cell to inspect exact check-ins and drop-off analytics.
          </div>
        )}
      </div>
    </section>
  );
}
