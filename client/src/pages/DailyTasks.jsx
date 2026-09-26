import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInAppModal } from '../context/ModalContext.jsx';
import HabitMatrixGrid from '../components/habits/HabitMatrixGrid.jsx';
import CohortRetentionMatrix from '../components/habits/CohortRetentionMatrix.jsx';
import * as habitService from '../services/habits.js';
import { getDuoCustomCategories, addDuoCustomCategory } from '../services/duo.js';
import { getLocalTodayStr, subscribeToMidnightTick } from '../utils/dateUtils.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORIES = [
  { id: 'All', label: 'All' },
  { id: 'Productivity', label: 'Productivity' },
  { id: 'Fitness', label: 'Fitness' },
  { id: 'Health', label: 'Health' },
  { id: 'Focus', label: 'Focus' },
  { id: 'Mindset', label: 'Mindset' },
];

const CATEGORY_OPTIONS = [
  { id: 'Productivity', label: 'Productivity', color: '#606c38' },
  { id: 'Fitness', label: 'Fitness', color: '#88994f' },
  { id: 'Health', label: 'Health', color: '#a9b876' },
  { id: 'Focus', label: 'Focus', color: '#283618' },
  { id: 'Mindset', label: 'Mindset', color: '#dda15e' },
  { id: 'Custom', label: 'Custom', color: '#bc6c25' },
];

const TIME_OPTIONS = [
  { id: 'anytime', label: 'Anytime', hint: 'Flexible all day' },
  { id: 'morning', label: 'Morning', hint: '6 AM - 12 PM' },
  { id: 'afternoon', label: 'Afternoon', hint: '12 PM - 5 PM' },
  { id: 'evening', label: 'Evening', hint: '5 PM - 11 PM' },
];

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', xp: '+5 XP', color: '#88994f' },
  { id: 'medium', label: 'Medium', xp: '+10 XP', color: '#dda15e' },
  { id: 'high', label: 'High', xp: '+20 XP', color: '#bc6c25' },
];

const PRESET_TEMPLATES = [
  { title: '45m Gym Session', category: 'Fitness', icon: '🏋️', timeOfDay: 'morning', priority: 'high', desc: 'Heavy weights or strength work' },
  { title: 'Drink 2.5L Water', category: 'Health', icon: '💧', timeOfDay: 'anytime', priority: 'medium', desc: 'Consistent hydration throughout the day' },
  { title: 'Read 20 Pages', category: 'Focus', icon: '📚', timeOfDay: 'evening', priority: 'medium', desc: 'Personal growth or mindset book' },
  { title: '1hr Deep Focus / Coding', category: 'Productivity', icon: '⚡', timeOfDay: 'morning', priority: 'high', desc: 'Distraction-free high-leverage focus' },
  { title: '10m Mindfulness', category: 'Mindset', icon: '🧘', timeOfDay: 'morning', priority: 'low', desc: 'Breathwork, meditation, and calm' },
  { title: 'Clean Nutrition Meal', category: 'Health', icon: '🥗', timeOfDay: 'afternoon', priority: 'medium', desc: 'Whole foods and high protein' },
  { title: '10,000 Daily Steps', category: 'Fitness', icon: '🏃', timeOfDay: 'anytime', priority: 'medium', desc: 'Active walking and recovery' },
  { title: 'Gratitude Reflection', category: 'Mindset', icon: '✍️', timeOfDay: 'evening', priority: 'low', desc: 'Write down 3 daily wins' },
];

const EXTENDED_EMOJIS = [
  '🎯', '⚡', '🏋️', '🏃', '💧', '📚', '🧘', '💻',
  '🥗', '🍏', '🚴', '🏊', '✍️', '🎨', '🧠', '🛌',
  '💊', '🔥', '🛡️', '⭐', '🏆', '🎵', '🌿', '☕'
];

const QUICK_SUGGESTIONS = PRESET_TEMPLATES.slice(0, 5);

// Helpers for Sprint Date calculations
function addDaysToDate(dateStr, days) {
  if (!dateStr) dateStr = getLocalTodayStr();
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + (days - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthEndDate(dateStr) {
  if (!dateStr) dateStr = getLocalTodayStr();
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const m = String(month + 1).padStart(2, '0');
  return `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
}

function countDaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 1;
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diffTime = d2 - d1;
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

const SPRINT_PRESETS = [
  { id: '3d', label: '3 Days', desc: 'Quick Sprint', days: 3 },
  { id: '5d', label: '5 Days (Exam / Sprint)', desc: 'Intensive Prep', days: 5 },
  { id: '7d', label: '7 Days', desc: '1-Week Mission', days: 7 },
  { id: '14d', label: '14 Days', desc: '2-Week Ramp', days: 14 },
  { id: 'month_end', label: 'Until Month End', desc: 'Complete This Month', isMonthEnd: true },
  { id: 'custom', label: 'Custom Range', desc: 'Pick Specific Dates', isCustom: true },
];

export default function DailyTasks() {
  const { user, refreshUser } = useAuth();
  const { showConfirm } = useInAppModal();
  const navigate = useNavigate();

  const [habits, setHabits] = useState([]);
  const [summary, setSummary] = useState({
    totalHabits: 0,
    completedCount: 0,
    percentComplete: 0,
    todayXP: 0,
    todayStr: getLocalTodayStr(),
    joinDateStr: getLocalTodayStr(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Status Tab filter: 'active' (active routines & sprints) | 'completed' (concluded goals) | 'all'
  const [habitStatusTab, setHabitStatusTab] = useState('active');

  // Month navigation state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());


  // Loading indicator for toggled cell
  const [togglingHabitId, setTogglingHabitId] = useState(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Productivity',
    icon: '🎯',
    priority: 'medium',
    timeOfDay: 'anytime',
    habitType: 'ongoing', // 'ongoing' | 'sprint'
    startDate: getLocalTodayStr(),
    endDate: '',
    targetDays: 5,
    objectiveNote: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Duo custom categories
  const [duoCustomCats, setDuoCustomCats] = useState([]); // [{ name, isOwn, createdByUsername }]
  const [customCatInput, setCustomCatInput] = useState('');   // free-text name when "Custom" selected
  const customCatRef = useRef(null);

  // Conclude / Close Goal Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingHabit, setClosingHabit] = useState(null);
  const [concludeNote, setConcludeNote] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  // Load habits
  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await habitService.getHabits(null, 'all');
      setHabits(data.habits || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your daily tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load duo custom categories (if user is in a duo)
  const fetchDuoCategories = useCallback(async () => {
    if (!user?.duoId) return;
    try {
      const cats = await getDuoCustomCategories();
      setDuoCustomCats(cats);
    } catch (_) {
      // Non-critical — silently ignore
    }
  }, [user?.duoId]);

  useEffect(() => {
    fetchHabits();
    fetchDuoCategories();
  }, [fetchHabits, fetchDuoCategories]);

  // Subscribe to exact 12:00:00 AM midnight tick to flip the day and reload tasks automatically
  useEffect(() => {
    const unsubscribe = subscribeToMidnightTick(() => {
      fetchHabits();
      const d = new Date();
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
    });

    const handleNewDay = () => {
      fetchHabits();
    };
    window.addEventListener('twogether:new-day', handleNewDay);

    return () => {
      unsubscribe();
      window.removeEventListener('twogether:new-day', handleNewDay);
    };
  }, [fetchHabits]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleTodayMonth = () => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
  };

  const isCurrentMonth =
    now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;

  // Open modal for Create
  const handleOpenCreate = (isSprint = false) => {
    setEditingHabit(null);
    const today = getLocalTodayStr();
    setFormData({
      title: '',
      description: '',
      category: 'Productivity',
      icon: isSprint ? '🎯' : '⚡',
      priority: 'medium',
      timeOfDay: 'anytime',
      habitType: isSprint ? 'sprint' : 'ongoing',
      startDate: today,
      endDate: isSprint ? addDaysToDate(today, 5) : '',
      targetDays: isSprint ? 5 : 0,
      objectiveNote: '',
    });
    setCustomCatInput('');
    fetchDuoCategories();
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (habit) => {
    setEditingHabit(habit);
    const builtIn = ['Health', 'Fitness', 'Focus', 'Mindset', 'Productivity'];
    const isCustomCat = habit.category && !builtIn.includes(habit.category);
    setFormData({
      title: habit.title || '',
      description: habit.description || '',
      category: isCustomCat ? '__custom__' : (habit.category || 'Productivity'),
      icon: habit.icon || '🎯',
      priority: habit.priority || 'medium',
      timeOfDay: habit.timeOfDay || 'anytime',
      habitType: habit.habitType || 'ongoing',
      startDate: habit.startDate || habit.createdAt?.slice(0, 10) || getLocalTodayStr(),
      endDate: habit.endDate || '',
      targetDays: habit.targetDays || 5,
      objectiveNote: habit.objectiveNote || '',
    });
    setCustomCatInput(isCustomCat ? habit.category : '');
    fetchDuoCategories();
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    // Resolve the actual category name
    let resolvedCategory = formData.category;
    if (formData.category === '__custom__') {
      const name = customCatInput.trim();
      if (!name) {
        setError('Please enter a name for your custom category.');
        customCatRef.current?.focus();
        return;
      }
      resolvedCategory = name;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...formData,
        category: resolvedCategory,
        targetDays:
          formData.habitType === 'sprint'
            ? countDaysBetween(formData.startDate, formData.endDate)
            : undefined,
      };

      if (editingHabit) {
        await habitService.updateHabit(editingHabit._id, payload);
        setSuccessMsg('Task updated successfully!');
      } else {
        await habitService.createHabit(payload);
        setSuccessMsg(
          formData.habitType === 'sprint'
            ? `Started ${payload.targetDays}-day sprint: "${formData.title}"!`
            : 'Daily task created successfully!'
        );
      }

      // If a custom category name was used AND user is in a duo, register it so partner sees it
      if (formData.category === '__custom__' && resolvedCategory && user?.duoId) {
        try {
          const updated = await addDuoCustomCategory(resolvedCategory);
          setDuoCustomCats(updated);
        } catch (_) { /* non-critical */ }
      }

      setIsModalOpen(false);
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Conclude Goal modal
  const handleOpenCloseGoal = (habit) => {
    setClosingHabit(habit);
    setConcludeNote('');
    setIsCloseModalOpen(true);
  };

  // Confirm Conclude Goal
  const handleConfirmCloseGoal = async (e) => {
    e.preventDefault();
    if (!closingHabit) return;

    setClosingSubmitting(true);
    setError('');
    try {
      const res = await habitService.closeHabit(closingHabit._id, concludeNote);
      setSuccessMsg(res.message || 'Goal concluded successfully!');
      setIsCloseModalOpen(false);
      setClosingHabit(null);
      await fetchHabits();
      if (refreshUser) refreshUser();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to conclude goal');
    } finally {
      setClosingSubmitting(false);
    }
  };

  // Reopen Concluded Goal
  const handleReopenGoal = async (habit) => {
    try {
      const res = await habitService.reopenHabit(habit._id);
      setSuccessMsg(res.message || `Reopened "${habit.title}"!`);
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reopen goal');
    }
  };

  // Direct inline creation from spreadsheet row
  const handleInlineCreate = async (payload) => {
    try {
      const data = await habitService.createHabit(payload);
      setSuccessMsg(`Created "${payload.title}"`);
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 2500);
      return data?.habit;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create habit');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Direct inline rename from spreadsheet row
  const handleInlineUpdate = async (habitId, payload) => {
    try {
      await habitService.updateHabit(habitId, payload);
      setSuccessMsg('Updated habit');
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update habit');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 1-Click Add Quick Suggestion
  const handleAddSuggestion = async (item) => {
    try {
      await habitService.createHabit(item);
      setSuccessMsg(`Added "${item.title}"`);
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add suggestion');
    }
  };

  // Delete
  const handleDelete = async (habitId) => {
    const habitObj = habits.find((h) => h._id === habitId);
    const confirmed = await showConfirm({
      title: 'Delete Habit',
      message: `Are you sure you want to delete "${habitObj?.title || 'this habit'}"? All progress and check-in history for this task will be removed.`,
      confirmText: 'Delete Habit',
      cancelText: 'Keep Habit',
      variant: 'danger',
      icon: '🗑️',
    });
    if (!confirmed) {
      return;
    }
    try {
      await habitService.deleteHabit(habitId);
      setSuccessMsg('Task deleted');
      await fetchHabits();
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Toggle Check-in for Today
  const handleToggle = async (habitOrId) => {
    const id = typeof habitOrId === 'string' ? habitOrId : habitOrId._id;
    try {
      setTogglingHabitId(id);
      const res = await habitService.toggleHabit(id, getLocalTodayStr());
      await fetchHabits();
      if (refreshUser) refreshUser();
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in task');
      setTimeout(() => setError(''), 3500);
    } finally {
      setTogglingHabitId(null);
    }
  };


  const todayDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="app-shell">
      <main className="container tasks-page">
        {/* Global Action Alerts */}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="alert alert--success" role="status">
            {successMsg}
          </div>
        )}

        {/* ======================================================== */}
        {/* MINIMALIST HEADER & QUICK STATS                          */}
        {/* ======================================================== */}
        <section className="tasks-minimal-header">
          <div className="tasks-minimal-header__left">
            <div className="tasks-minimal-title-row">
              <h1 className="tasks-minimal-title">Daily Habits & Goals</h1>
              <span className="tasks-minimal-date-badge">
                {todayDateFormatted}
              </span>
            </div>
          </div>

          <div className="tasks-minimal-header__right">
            {/* Inline Sleek Progress Capsule */}
            <div
              className="tasks-minimal-progress-capsule"
              title={`${summary.completedCount || 0} of ${summary.totalHabits || 0} completed today (+${summary.todayXP || 0} XP)`}
            >
              <div className="tasks-minimal-progress-text">
                <span className="tasks-minimal-count">
                  <strong>{summary.completedCount || 0}</strong>/{summary.totalHabits || 0} done
                </span>
                <span className="tasks-minimal-pct">
                  {summary.percentComplete || 0}%
                </span>
                <span className="tasks-minimal-xp">
                  +{summary.todayXP || 0} XP
                </span>
              </div>
              <div className="tasks-minimal-bar">
                <div
                  className="tasks-minimal-bar__fill"
                  style={{ width: `${summary.percentComplete || 0}%` }}
                />
              </div>
            </div>

            {/* Habit / Sprint Goal Action Buttons */}
            <div className="tasks-header-btn-group">
              <button
                type="button"
                className="btn btn--secondary btn--sm tasks-minimal-sprint-btn"
                onClick={() => handleOpenCreate(true)}
                title="Start a time-bounded sprint (e.g. 5-day exam prep, 14-day challenge)"
              >
                + Sprint Goal
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm tasks-minimal-add-btn"
                onClick={() => handleOpenCreate(false)}
                title="Add a daily recurring habit"
              >
                + Add Habit
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* MONTH NAVIGATION & VIEW MODE SWITCHER TOOLBAR            */}
        {/* ======================================================== */}
        <section className="month-nav-toolbar">
          <div className="month-nav-controls">
            <button
              type="button"
              className="btn btn--ghost btn--sm month-nav-btn"
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
            >
              ‹
            </button>

            <div className="month-nav-display">
              <span className="month-nav-name">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              {isCurrentMonth ? (
                <span className="badge badge--pill" style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem' }}>
                  CURRENT
                </span>
              ) : (
                <button
                  type="button"
                  className="month-jump-today-btn"
                  onClick={handleTodayMonth}
                  title="Jump to current month"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--sm month-nav-btn"
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
            >
              ›
            </button>
          </div>

          {/* Habit Status Filter Tabs: Active Routines & Sprints vs Concluded Goals */}
          <div className="tasks-status-tabs">
            <button
              type="button"
              className={`tasks-status-tab ${habitStatusTab === 'active' ? 'tasks-status-tab--active' : ''}`}
              onClick={() => setHabitStatusTab('active')}
            >
              Active ({habits.filter((h) => h.status !== 'completed').length})
            </button>
            <button
              type="button"
              className={`tasks-status-tab ${habitStatusTab === 'completed' ? 'tasks-status-tab--active' : ''}`}
              onClick={() => setHabitStatusTab('completed')}
            >
              Concluded Goals ({habits.filter((h) => h.status === 'completed').length})
            </button>
            <button
              type="button"
              className={`tasks-status-tab ${habitStatusTab === 'all' ? 'tasks-status-tab--active' : ''}`}
              onClick={() => setHabitStatusTab('all')}
            >
              All ({habits.length})
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* PRIMARY VIEW: MONTHLY HABIT MATRIX GRID                  */}
        {/* ======================================================== */}
        {loading ? (
          <div className="spinner-wrap" style={{ padding: '3rem 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {/* 1. The Excel-Style Monthly Habit Tracker Spreadsheet */}
            <HabitMatrixGrid
              habits={habits.filter((h) => {
                if (habitStatusTab === 'active') return h.status !== 'completed';
                if (habitStatusTab === 'completed') return h.status === 'completed';
                return true;
              })}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              todayStr={summary.todayStr || getLocalTodayStr()}
              joinDateStr={summary.joinDateStr || user?.createdAt?.slice(0, 10)}
              onToggleToday={handleToggle}
              onInlineCreateHabit={handleInlineCreate}
              onInlineUpdateHabit={handleInlineUpdate}
              onEditHabit={handleOpenEdit}
              onDeleteHabit={handleDelete}
              onOpenAddModal={() => handleOpenCreate(false)}
              onCloseGoal={handleOpenCloseGoal}
              onReopenGoal={handleReopenGoal}
              togglingHabitId={togglingHabitId}
            />

            {/* 2. Analytics 11 - Cohort Retention & Habit Consistency Matrix */}
            <CohortRetentionMatrix
              habits={habits}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              todayStr={summary.todayStr || getLocalTodayStr()}
              joinDateStr={summary.joinDateStr || user?.createdAt?.slice(0, 10)}
            />
          </>
        )}

        {/* Quick Link Banner to Duo Section */}
        <section className="duo-callout-banner">
          <div className="duo-callout-banner__content">
            <div>
              <h3>Share accountability in the Duo section</h3>
              <p className="muted">
                Complete habits together with a friend to build synergy and keep the Duo streak alive!
              </p>
            </div>
          </div>
          <Link to="/dashboard" className="btn btn--secondary btn--md">
            SWITCH TO DUO SECTION ➜
          </Link>
        </section>
      </main>

      {/* ======================================================== */}
      {/* RICH TASK & SPRINT BUILDER MODAL (Create & Edit)         */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card modal-card--task-builder"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTaskTitle"
          >
            {/* Modal Header */}
            <div className="task-builder-header">
              <div className="task-builder-header__title-wrap">
                <span className="badge badge--pill">
                  {editingHabit
                    ? 'TASK EDITOR'
                    : formData.habitType === 'sprint'
                    ? 'SPRINT GOAL BUILDER'
                    : 'HABIT BUILDER'}
                </span>
                <h2 id="modalTaskTitle" className="task-builder-title">
                  {editingHabit
                    ? 'Edit Habit / Goal'
                    : formData.habitType === 'sprint'
                    ? 'Create Time-Bounded Sprint Goal'
                    : 'Create Daily Habit'}
                </h2>
                <p className="task-builder-subtitle">
                  {formData.habitType === 'sprint'
                    ? 'Targeted mission for exams, 5-day sprints, or mid-month goals that close when complete'
                    : 'Build long-term daily consistency with solo execution and Duo accountability'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Habit Type Switcher (Ongoing vs Sprint Goal) */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Habit Objective Type</label>
              <div className="habit-type-selector">
                <button
                  type="button"
                  className={`habit-type-btn ${
                    formData.habitType === 'ongoing' ? 'habit-type-btn--active' : ''
                  }`}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      habitType: 'ongoing',
                      endDate: '',
                    })
                  }
                >
                  <span className="habit-type-icon">⚡</span>
                  <div>
                    <strong>Daily Routine (Ongoing)</strong>
                    <small>Continuous daily habit tracked indefinitely</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`habit-type-btn ${
                    formData.habitType === 'sprint' ? 'habit-type-btn--active' : ''
                  }`}
                  onClick={() => {
                    const today = formData.startDate || getLocalTodayStr();
                    setFormData({
                      ...formData,
                      habitType: 'sprint',
                      startDate: today,
                      endDate: addDaysToDate(today, 5),
                      targetDays: 5,
                    });
                  }}
                >
                  <span className="habit-type-icon">🎯</span>
                  <div>
                    <strong>Time-Bounded Sprint (Exam / Goal)</strong>
                    <small>Specific duration (e.g. 5 days, closes on completion)</small>
                  </div>
                </button>
              </div>
            </div>

            {/* Time-Bounded Sprint Configuration Block */}
            {formData.habitType === 'sprint' && (
              <div className="sprint-config-box">
                <label className="sprint-config-box__label">
                  Sprint Duration & Preset Limits
                </label>
                <div className="sprint-presets-grid">
                  {SPRINT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="sprint-preset-chip"
                      onClick={() => {
                        const today = formData.startDate || getLocalTodayStr();
                        if (preset.isMonthEnd) {
                          const monthEnd = getMonthEndDate(today);
                          const days = countDaysBetween(today, monthEnd);
                          setFormData({
                            ...formData,
                            startDate: today,
                            endDate: monthEnd,
                            targetDays: days,
                          });
                        } else if (!preset.isCustom) {
                          setFormData({
                            ...formData,
                            startDate: today,
                            endDate: addDaysToDate(today, preset.days),
                            targetDays: preset.days,
                          });
                        }
                      }}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.desc}</small>
                    </button>
                  ))}
                </div>

                <div className="sprint-dates-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="sprintStartDate">Start Date</label>
                    <input
                      id="sprintStartDate"
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const newDays = countDaysBetween(newStart, formData.endDate);
                        setFormData({
                          ...formData,
                          startDate: newStart,
                          targetDays: newDays,
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="sprintEndDate">Goal End / Exam Date</label>
                    <input
                      id="sprintEndDate"
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const newDays = countDaysBetween(formData.startDate, newEnd);
                        setFormData({
                          ...formData,
                          endDate: newEnd,
                          targetDays: newDays,
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="sprint-days-summary">
                    <span className="sprint-days-num">
                      {countDaysBetween(formData.startDate, formData.endDate)}
                    </span>
                    <span className="sprint-days-label">Target Days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Inspiration Presets (Shown on Create Mode for Ongoing) */}
            {!editingHabit && formData.habitType === 'ongoing' && (
              <div className="preset-inspirations">
                <div className="preset-inspirations__label">
                  <span>Quick Presets:</span>
                </div>
                <div className="preset-inspirations__scroll">
                  {PRESET_TEMPLATES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          title: preset.title,
                          description: preset.desc,
                          category: preset.category,
                          icon: preset.icon,
                          priority: preset.priority,
                          timeOfDay: preset.timeOfDay,
                        });
                      }}
                      title={`Quick-fill ${preset.title}`}
                    >
                      <span className="preset-chip__text">{preset.title}</span>
                      <span className="preset-chip__tag">{preset.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSave} className="task-builder-form">
              {/* Task Title Input */}
              <div className="form-group form-group--highlight">
                <div className="form-group__label-row">
                  <label htmlFor="taskTitle">
                    {formData.habitType === 'sprint' ? 'Goal / Mission Title *' : 'Task Title *'}
                  </label>
                  <span className="form-char-count">{formData.title.length}/100</span>
                </div>
                <input
                  id="taskTitle"
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    formData.habitType === 'sprint'
                      ? 'e.g. 5 Days Extra Study for Physics Exam, 14 Days Morning Run'
                      : 'e.g. 45m Gym Workout, Read 20 Pages, Drink 2L Water'
                  }
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              {/* Notes & Target Details Textarea */}
              <div className="form-group">
                <div className="form-group__label-row">
                  <label htmlFor="taskDesc">Notes & Target Details (optional)</label>
                  <span className="form-char-count">{formData.description.length}/500</span>
                </div>
                <textarea
                  id="taskDesc"
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., 4 sets of bench press, chapters 3–4 revision, or 10 min quiet breathwork"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Category Visual Selector Grid */}
              <div className="form-group">
                <label>Select Category</label>
                <div className="category-select-grid">
                  {/* Built-in categories */}
                  {CATEGORY_OPTIONS.filter(c => c.id !== 'Custom').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-select-btn ${formData.category === cat.id ? 'category-select-btn--active' : ''}`}
                      onClick={() => { setFormData({ ...formData, category: cat.id }); setCustomCatInput(''); }}
                    >
                      <span className="category-select-btn__label">{cat.label}</span>
                    </button>
                  ))}

                  {/* Duo shared custom categories — each with ownership badge */}
                  {duoCustomCats.map((cat) => (
                    <button
                      key={`duo-${cat.name}`}
                      type="button"
                      title={cat.isOwn ? 'Your custom category' : `Created by ${cat.createdByUsername}`}
                      className={`category-select-btn category-select-btn--custom ${
                        formData.category === '__custom__' && customCatInput.toLowerCase() === cat.name.toLowerCase()
                          ? 'category-select-btn--active'
                          : ''
                      }`}
                      onClick={() => {
                        setFormData({ ...formData, category: '__custom__' });
                        setCustomCatInput(cat.name);
                      }}
                    >
                      <span className="category-select-btn__badge">
                        {cat.isOwn ? '✦' : '👤'}
                      </span>
                      <span className="category-select-btn__label">{cat.name}</span>
                    </button>
                  ))}

                  {/* "+ New Custom" button */}
                  <button
                    type="button"
                    className={`category-select-btn category-select-btn--new-custom ${
                      formData.category === '__custom__' && !duoCustomCats.some(c => c.name.toLowerCase() === customCatInput.toLowerCase())
                        ? 'category-select-btn--active'
                        : ''
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, category: '__custom__' });
                      setCustomCatInput('');
                      setTimeout(() => customCatRef.current?.focus(), 50);
                    }}
                  >
                    <span className="category-select-btn__badge">＋</span>
                    <span className="category-select-btn__label">New Custom</span>
                  </button>
                </div>

                {/* Inline custom category name input */}
                {formData.category === '__custom__' && (
                  <div className="custom-cat-input-wrap">
                    <input
                      ref={customCatRef}
                      type="text"
                      className="form-input custom-cat-input"
                      placeholder="Type your custom category name…"
                      value={customCatInput}
                      maxLength={40}
                      onChange={(e) => setCustomCatInput(e.target.value)}
                    />
                    <span className="custom-cat-input-hint">
                      {user?.duoId ? '🔗 Shared with your partner when saved' : '📝 Personal category'}
                    </span>
                  </div>
                )}
              </div>

              {/* Time of Day & Priority Visual Segmented Controls */}
              <div className="form-row form-row--segmented">
                {/* Time of Day */}
                <div className="form-group">
                  <label>Time of Day</label>
                  <div className="segmented-control">
                    {TIME_OPTIONS.map((time) => (
                      <button
                        key={time.id}
                        type="button"
                        className={`segmented-btn ${formData.timeOfDay === time.id ? 'segmented-btn--active' : ''}`}
                        onClick={() => setFormData({ ...formData, timeOfDay: time.id })}
                        title={time.hint}
                      >
                        <span>{time.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Level with XP badges */}
                <div className="form-group">
                  <label>Priority & Reward</label>
                  <div className="segmented-control">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`segmented-btn segmented-btn--priority-${p.id} ${
                          formData.priority === p.id ? 'segmented-btn--active' : ''
                        }`}
                        onClick={() => setFormData({ ...formData, priority: p.id })}
                      >
                        <span>{p.label}</span>
                        <small className="segmented-xp">{p.xp}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions task-builder-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md btn--shimmer"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner spinner--sm" /> Saving…
                    </>
                  ) : editingHabit ? (
                    'Save Changes'
                  ) : formData.habitType === 'sprint' ? (
                    `Launch ${countDaysBetween(formData.startDate, formData.endDate)}-Day Sprint Goal`
                  ) : (
                    'Create Daily Habit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONCLUDE / CLOSE SPRINT GOAL MODAL                       */}
      {/* ======================================================== */}
      {isCloseModalOpen && closingHabit && (
        <div className="modal-backdrop" onClick={() => setIsCloseModalOpen(false)}>
          <div
            className="modal-card modal-card--conclude-goal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalConcludeTitle"
          >
            <div className="task-builder-header">
              <div className="task-builder-header__title-wrap">
                <span className="badge badge--success">CONCLUDE SPRINT GOAL</span>
                <h2 id="modalConcludeTitle" className="task-builder-title">
                  Conclude &ldquo;{closingHabit.title}&rdquo;
                </h2>
                <p className="task-builder-subtitle">
                  Lock final performance accuracy, award completion XP, and conclude this objective.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCloseModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Goal Statistics Summary */}
            <div className="conclude-goal-stats">
              <div className="conclude-stat-item">
                <span className="conclude-stat-label">DATE WINDOW</span>
                <strong className="conclude-stat-val">
                  {closingHabit.startDate || closingHabit.createdAt?.slice(0, 10)} →{' '}
                  {closingHabit.endDate || 'Today'}
                </strong>
              </div>

              <div className="conclude-stat-item">
                <span className="conclude-stat-label">CHECK-INS</span>
                <strong className="conclude-stat-val">
                  {(closingHabit.completedDates || []).length} / {closingHabit.targetDays || 5} Days
                </strong>
              </div>

              <div className="conclude-stat-item">
                <span className="conclude-stat-label">ESTIMATED ACCURACY</span>
                <strong className="conclude-stat-val" style={{ color: 'var(--cyan)' }}>
                  {Math.round(
                    ((closingHabit.completedDates || []).length /
                      Math.max(1, closingHabit.targetDays || 5)) *
                      100
                  )}
                  %
                </strong>
              </div>
            </div>

            {/* Bonus notice */}
            <div className="conclude-bonus-banner">
              <span>
                🎯 <strong>Goal Completion Bonus:</strong> Achieving ≥ 80% accuracy will award a permanent <strong>+50 XP Mission Mastery Bonus</strong>!
              </span>
            </div>

            {/* Reflection Note Input */}
            <form onSubmit={handleConfirmCloseGoal}>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="concludeReflection">
                  Objective Outcome & Reflections (optional)
                </label>
                <textarea
                  id="concludeReflection"
                  className="form-textarea"
                  value={concludeNote}
                  onChange={(e) => setConcludeNote(e.target.value)}
                  placeholder="e.g. Aced the Physics exam! Studied every day and covered all chapters."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="modal-actions task-builder-actions" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--md"
                  onClick={() => setIsCloseModalOpen(false)}
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={closingSubmitting}
                >
                  {closingSubmitting ? (
                    <>
                      <span className="spinner spinner--sm" /> Finalizing…
                    </>
                  ) : (
                    'Conclude & Freeze Accuracy ✓'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
