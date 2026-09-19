/**
 * Format a Date object or timestamp as YYYY-MM-DD in the user's local timezone.
 * Unlike toISOString() which shifts to UTC, this strictly respects local midnight (12:00:00 AM).
 */
export function getLocalTodayStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the number of milliseconds until the next 12:00:00 AM sharp (local midnight).
 */
export function getMsUntilNextMidnight() {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
  return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

/**
 * Subscribe to a callback that fires precisely at 12:00:00 AM sharp (every local midnight).
 * Dispatches a global 'twogether:new-day' window event so components can automatically refresh.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToMidnightTick(callback) {
  let timerId = null;

  function schedule() {
    const ms = getMsUntilNextMidnight();
    timerId = setTimeout(() => {
      const newDayStr = getLocalTodayStr();
      try {
        if (typeof callback === 'function') {
          callback(newDayStr);
        }
      } catch (err) {
        console.error('Midnight tick callback error:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('twogether:new-day', { detail: { date: newDayStr } })
        );
      }

      // Schedule for the next 12:00 AM sharp
      schedule();
    }, ms);
  }

  schedule();

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}
