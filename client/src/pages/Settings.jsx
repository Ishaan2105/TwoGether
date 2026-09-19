import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useDuo } from '../context/DuoContext.jsx';
import { useSidebar } from '../context/SidebarContext.jsx';
import api from '../services/api.js';
import {
  sendTestNotification,
  checkSubscriptionStatus,
  subscribeToWebPush,
  requestNotificationPermission,
} from '../services/notifications.js';

/* ── Eye Icon Component for Password Fields ───────────────────────── */
function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme, THEMES } = useTheme();
  const { duo, partner, nudge } = useDuo();
  const [searchParams] = useSearchParams();

  /* ── Streak Shield Vault Accordion state ────────────────────────── */
  const [isVaultOpen, setIsVaultOpen] = useState(() => searchParams.get('tab') === 'vault');
  const [sendingSOS, setSendingSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sosError, setSosError] = useState('');

  const soloShields = user?.inventory?.streakShields ?? 1;
  const duoShields = duo?.duoShields ?? 1;
  const totalShields = soloShields + (duo ? duoShields : 0);

  useEffect(() => {
    if (searchParams.get('tab') === 'vault') {
      setIsVaultOpen(true);
      setTimeout(() => {
        const el = document.getElementById('vault');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [searchParams]);

  const { openNudgeAction } = useSidebar();

  const handleSendSOS = () => {
    if (!duo || !partner) return;
    openNudgeAction('sos');
  };

  /* ── Notification state ─────────────────────────────────────────── */
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [notifEnabling, setNotifEnabling] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [testNotifStatus, setTestNotifStatus] = useState('idle'); // idle | loading | done | error

  /* ── Username edit state ────────────────────────────────────────── */
  const [usernameEdit, setUsernameEdit] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | loading | success | error
  const [usernameMsg, setUsernameMsg] = useState('');

  /* ── Change Password Accordion & form state ─────────────────────── */
  const [isPasswordOpen, setIsPasswordOpen] = useState(() => Boolean(user?.mustChangePassword));
  const [existingPassword, setExistingPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState('idle'); // idle | loading | success | error
  const [passwordMsg, setPasswordMsg] = useState('');

  /* ── Delete Account Accordion & form state ──────────────────────── */
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword1, setDeletePassword1] = useState('');
  const [deletePassword2, setDeletePassword2] = useState('');
  const [showDeletePassword1, setShowDeletePassword1] = useState(false);
  const [showDeletePassword2, setShowDeletePassword2] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('idle'); // idle | loading | error
  const [deleteMsg, setDeleteMsg] = useState('');

  // Keep notification permission state updated
  useEffect(() => {
    const updatePerm = () => {
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission);
      }
    };
    updatePerm();
  }, []);

  /* ── Handle Enable Notifications ───────────────────────────────── */
  const handleEnableNotifications = useCallback(async () => {
    if (notifEnabling) return;
    setNotifEnabling(true);
    setNotifError('');
    try {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        const already = await checkSubscriptionStatus();
        if (!already) await subscribeToWebPush();
      } else if (perm === 'denied') {
        setNotifError(
          'Notifications are currently blocked by Android or your browser. To fix: Open Android Settings > Apps > TwoGether (or Chrome) > Notifications and turn them ON.'
        );
      }
    } catch (err) {
      setNotifError(err.message || 'Failed to enable notifications. Please try again.');
    } finally {
      setNotifEnabling(false);
    }
  }, [notifEnabling]);

  /* ── Handle Test Notification ─────────────────────────────────── */
  const handleTestNotification = useCallback(async () => {
    if (testNotifStatus === 'loading') return;

    if (notifPermission !== 'granted') {
      await handleEnableNotifications();
      return;
    }

    const isSubscribed = await checkSubscriptionStatus();
    if (!isSubscribed) {
      try {
        await subscribeToWebPush();
      } catch {
        setTestNotifStatus('error');
        setTimeout(() => setTestNotifStatus('idle'), 3000);
        return;
      }
    }

    setTestNotifStatus('loading');
    try {
      await sendTestNotification();
      setTestNotifStatus('done');
    } catch {
      setTestNotifStatus('error');
    }
    setTimeout(() => setTestNotifStatus('idle'), 3500);
  }, [testNotifStatus, notifPermission, handleEnableNotifications]);

  /* ── Handle Username Save ──────────────────────────────────────── */
  const handleStartEditUsername = () => {
    setUsernameEdit(user?.username || '');
    setUsernameStatus('idle');
    setUsernameMsg('');
    setIsEditingUsername(true);
  };

  const handleSaveUsername = useCallback(async () => {
    const trimmed = usernameEdit.trim().toLowerCase();
    if (!trimmed || trimmed === user?.username?.toLowerCase()) {
      setIsEditingUsername(false);
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameMsg('Username must be 3–20 characters.');
      setUsernameStatus('error');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameMsg('Only letters, numbers, and underscores allowed.');
      setUsernameStatus('error');
      return;
    }

    setUsernameStatus('loading');
    setUsernameMsg('');
    try {
      await api.patch('/auth/update-username', { username: trimmed });
      await refreshUser();
      setUsernameStatus('success');
      setUsernameMsg('Username updated successfully!');
      setTimeout(() => {
        setIsEditingUsername(false);
        setUsernameStatus('idle');
        setUsernameMsg('');
      }, 1500);
    } catch (err) {
      setUsernameStatus('error');
      setUsernameMsg(err?.response?.data?.message || 'Failed to update username.');
    }
  }, [usernameEdit, user?.username, refreshUser]);

  /* ── Handle Change Password ────────────────────────────────────── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');

    if (!existingPassword) {
      setPasswordStatus('error');
      setPasswordMsg('Please enter your existing password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus('error');
      setPasswordMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus('error');
      setPasswordMsg('New password and confirmation do not match.');
      return;
    }
    if (existingPassword === newPassword) {
      setPasswordStatus('error');
      setPasswordMsg('New password cannot be the same as your existing password.');
      return;
    }

    setPasswordStatus('loading');
    try {
      await api.patch('/auth/change-password', {
        currentPassword: existingPassword,
        newPassword,
        confirmNewPassword,
      });
      setPasswordStatus('success');
      setPasswordMsg('Password changed successfully! Your custom password is now active.');
      setExistingPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      if (refreshUser) {
        await refreshUser();
      }
      setTimeout(() => {
        setPasswordStatus('idle');
        setPasswordMsg('');
        setIsPasswordOpen(false);
      }, 2500);
    } catch (err) {
      setPasswordStatus('error');
      setPasswordMsg(err?.response?.data?.message || 'Failed to change password. Please check your existing password.');
    }
  };

  /* ── Handle Delete Account ─────────────────────────────────────── */
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteMsg('');

    if (!deletePassword1 || !deletePassword2) {
      setDeleteStatus('error');
      setDeleteMsg('Please enter your current password twice to confirm deletion.');
      return;
    }
    if (deletePassword1 !== deletePassword2) {
      setDeleteStatus('error');
      setDeleteMsg('The two entered passwords do not match. Please re-enter carefully.');
      return;
    }

    setDeleteStatus('loading');
    try {
      await api.delete('/auth/delete-account', {
        data: {
          password: deletePassword1,
          confirmPassword: deletePassword2,
        },
      });
      // Logout and route to landing page
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteStatus('error');
      setDeleteMsg(err?.response?.data?.message || 'Incorrect password. Account deletion aborted.');
    }
  };

  const initial = (user?.username?.[0] || 'U').toUpperCase();
  const notifGranted = notifPermission === 'granted';
  const notifDenied = notifPermission === 'denied';

  return (
    <div className="app-shell">
      <main className="settings-page">
        {/* ── 1. Page Header ── */}
        <section className="settings-hero">
          <h1 className="settings-hero__title">Settings</h1>
          <p className="settings-hero__subtitle">
            Customize visual themes, notification alerts, user credentials, and security controls.
          </p>
        </section>

        {/* ── Temporary Password Notification Alert ── */}
        {user?.mustChangePassword && (
          <div
            className="settings-alert settings-alert--warning"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🔑</span>
            <div>
              <strong style={{ fontSize: '0.98rem', color: '#f59e0b', display: 'block' }}>
                Temporary Password Active
              </strong>
              <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                You signed in with a temporary recovery password. Please scroll down to the <strong>Change Password</strong> section to establish your personal permanent password.
              </span>
            </div>
          </div>
        )}

        {/* ── 2. Profile Overview Card ── */}
        <section className="settings-card settings-profile-card">
          <div className="settings-profile-card__avatar">
            <span>{initial}</span>
            <span className="settings-profile-card__online-dot" />
          </div>
          <div className="settings-profile-card__details">
            <div className="settings-profile-card__name-row">
              <h2 className="settings-profile-card__username">@{user?.username}</h2>
              <span className="settings-level-pill">
                ⚡ Lv {user?.personalLevel || 1}
              </span>
              {user?.customTitle && (
                <span className="settings-title-pill">{user.customTitle}</span>
              )}
            </div>
            <p className="settings-profile-card__email">{user?.email}</p>
            <div className="settings-profile-card__stats">
              <div className="settings-stat-item">
                <span className="settings-stat-item__label">Solo Streak</span>
                <span className="settings-stat-item__val">🔥 {user?.soloStreak || 0}d</span>
              </div>
              <div className="settings-stat-item">
                <span className="settings-stat-item__label">Personal XP</span>
                <span className="settings-stat-item__val">✨ {user?.personalXP || 0} XP</span>
              </div>
              <div className="settings-stat-item">
                <span className="settings-stat-item__label">Shields</span>
                <span className="settings-stat-item__val">🛡️ {user?.inventory?.streakShields ?? 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Appearance & Theme ── */}
        <section className="settings-card">
          <div className="settings-card__header">
            <div className="settings-card__icon-wrap">
              <span aria-hidden="true">🎨</span>
            </div>
            <div>
              <h2 className="settings-card__title">Appearance & Color Theme</h2>
              <p className="settings-card__desc">Choose an aesthetic tailored for your workspace and daily motivation.</p>
            </div>
          </div>

          <div className="settings-theme-grid" role="group" aria-label="Available themes">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`settings-theme-card ${isSelected ? 'settings-theme-card--active' : ''}`}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={isSelected}
                >
                  <div
                    className="settings-theme-card__swatch"
                    style={{ backgroundColor: t.previewColor, borderColor: t.accentColor }}
                  >
                    <span
                      className="settings-theme-card__accent"
                      style={{ backgroundColor: t.accentColor }}
                    />
                  </div>
                  <div className="settings-theme-card__info">
                    <span className="settings-theme-card__name">{t.name}</span>
                    <span className="settings-theme-card__desc">{t.desc || 'High-contrast palette'}</span>
                  </div>
                  {isSelected && (
                    <span className="settings-theme-card__check" aria-hidden="true">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 4. Change Username ── */}
        <section className="settings-card">
          <div className="settings-card__header">
            <div className="settings-card__icon-wrap">
              <span aria-hidden="true">✏️</span>
            </div>
            <div className="settings-card__title-flex">
              <div>
                <h2 className="settings-card__title">Username</h2>
                <p className="settings-card__desc">Your display identifier visible on Leaderboards and to your Duo partner.</p>
              </div>
              {!isEditingUsername && (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleStartEditUsername}
                >
                  Change Username
                </button>
              )}
            </div>
          </div>

          {!isEditingUsername ? (
            <div className="settings-field-static">
              <span className="settings-field-static__at">@</span>
              <span className="settings-field-static__value">{user?.username}</span>
            </div>
          ) : (
            <div className="settings-field-editor">
              <div className="settings-input-group">
                <span className="settings-input-prefix">@</span>
                <input
                  type="text"
                  className="settings-input settings-input--prefixed"
                  value={usernameEdit}
                  onChange={(e) => setUsernameEdit(e.target.value)}
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveUsername();
                    if (e.key === 'Escape') setIsEditingUsername(false);
                  }}
                  placeholder="new_username"
                  aria-label="New username"
                />
              </div>

              {usernameMsg && (
                <p className={`settings-msg ${usernameStatus === 'error' ? 'settings-msg--error' : 'settings-msg--success'}`}>
                  {usernameMsg}
                </p>
              )}

              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setIsEditingUsername(false)}
                  disabled={usernameStatus === 'loading'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleSaveUsername}
                  disabled={usernameStatus === 'loading'}
                >
                  {usernameStatus === 'loading' ? 'Saving…' : 'Save Username'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── 5. Push Notifications ── */}
        <section className="settings-card">
          <div className="settings-card__header">
            <div className="settings-card__icon-wrap">
              <span aria-hidden="true">🔔</span>
            </div>
            <div className="settings-card__title-flex">
              <div>
                <h2 className="settings-card__title">Push Notifications</h2>
                <p className="settings-card__desc">Receive instant reminders, partner image nudges, and SOS emergency alerts.</p>
              </div>
              <span className={`settings-status-badge ${notifGranted ? 'settings-status-badge--active' : notifDenied ? 'settings-status-badge--danger' : 'settings-status-badge--muted'}`}>
                {notifGranted ? '● ACTIVE' : notifDenied ? '● BLOCKED' : '● OFF'}
              </span>
            </div>
          </div>

          <div className="settings-notif-box">
            {notifDenied ? (
              <div className="settings-alert settings-alert--warning">
                <span className="settings-alert__icon">⚠️</span>
                <div>
                  <strong>Notifications are blocked in your browser.</strong>
                  <p>Click the lock/settings icon in your browser URL bar to grant notification permissions for this site.</p>
                </div>
              </div>
            ) : notifGranted ? (
              <div className="settings-alert settings-alert--success">
                <span className="settings-alert__icon">✅</span>
                <div>
                  <strong>Notifications are fully enabled.</strong>
                  <p>You will receive live nudges and streak warnings directly on this device.</p>
                </div>
              </div>
            ) : (
              <div className="settings-notif-enable-row">
                <p className="settings-notif-enable-text">
                  Enable background push alerts so you never miss a daily cutoff or a partner hype message.
                </p>
                <button
                  type="button"
                  className="btn btn--primary btn--md"
                  onClick={handleEnableNotifications}
                  disabled={notifEnabling}
                >
                  {notifEnabling ? 'Enabling…' : '🔔 Enable Notifications'}
                </button>
              </div>
            )}

            {notifError && (
              <div className="settings-alert settings-alert--warning" style={{ marginTop: '0.85rem' }}>
                <span className="settings-alert__icon">ℹ️</span>
                <div>
                  <strong>Notification Setup Notice</strong>
                  <p style={{ margin: 0, marginTop: '0.2rem', fontSize: '0.88rem' }}>{notifError}</p>
                </div>
              </div>
            )}

            {/* Test Notification button */}
            {notifGranted && (
              <div className="settings-notif-test-row">
                <button
                  type="button"
                  className={`btn btn--outline btn--sm ${testNotifStatus === 'done' ? 'btn--success' : ''}`}
                  onClick={handleTestNotification}
                  disabled={testNotifStatus === 'loading'}
                >
                  {testNotifStatus === 'loading'
                    ? '⚡ Sending Push Alert…'
                    : testNotifStatus === 'done'
                    ? '✅ Push Sent! Check your screen'
                    : testNotifStatus === 'error'
                    ? '❌ Failed — Try Again'
                    : '🧪 Send Test Push Notification'}
                </button>
                <span className="settings-hint">Sends a test alert to your system notification tray.</span>
              </div>
            )}
          </div>
        </section>

        {/* ── 6. Streak Shield Vault (Dropdown / Accordion) ── */}
        <section id="vault" className={`settings-card settings-accordion ${isVaultOpen ? 'settings-accordion--open' : ''}`}>
          <button
            type="button"
            className="settings-accordion__trigger"
            onClick={() => setIsVaultOpen((prev) => !prev)}
            aria-expanded={isVaultOpen}
          >
            <div className="settings-accordion__title-wrap">
              <div className="settings-card__icon-wrap">
                <span aria-hidden="true">🛡️</span>
              </div>
              <div className="settings-accordion__labels">
                <h2 className="settings-card__title">Streak Shield Vault</h2>
                <p className="settings-card__desc">Automated streak defense protocols and active shields inventory.</p>
              </div>
            </div>
            <div className="settings-accordion__meta">
              <span className="settings-accordion__tag settings-accordion__tag--shield">
                🛡️ {totalShields} Active
              </span>
              <span className={`settings-accordion__chevron ${isVaultOpen ? 'settings-accordion__chevron--open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </div>
          </button>

          {isVaultOpen && (
            <div className="settings-accordion__body settings-vault-body">
              {/* Status messages for Emergency SOS */}
              {sosError && (
                <div className="alert alert--error" role="alert" style={{ marginBottom: '1rem' }}>
                  {sosError}
                </div>
              )}
              {sosSent && (
                <div className="alert alert--success" role="status" style={{ marginBottom: '1rem' }}>
                  🚨 Emergency SOS sent to @{partner?.username}! High-priority notification dispatched.
                </div>
              )}

              {/* Shield Pods Grid */}
              <div className="vault-pods-grid settings-vault-pods">
                {/* 1. Personal Solo Streak Shield Pod */}
                <div className="vault-pod-card vault-pod-card--solo">
                  <div className="vault-pod-card__header">
                    <div className="vault-pod-card__icon-box">
                      <span>🛡️</span>
                    </div>
                    <div className="vault-pod-card__header-info">
                      <span className="vault-pod-card__type">SOLO DEFENSE</span>
                      <h3>Personal Streak Shield</h3>
                    </div>
                    <div className="vault-pod-card__count-badge">
                      <span>{soloShields} Available</span>
                    </div>
                  </div>

                  <div className="vault-pod-card__body">
                    <p className="vault-pod-card__desc">
                      Guarantees your personal solo streak if an unexpected event prevents you from checking in before midnight.
                    </p>

                    <div className="vault-pod-metrics">
                      <div className="vault-pod-metric">
                        <span className="vault-pod-metric__label">PROTECTED STREAK</span>
                        <span className="vault-pod-metric__val">🔥 {user?.soloStreak || 0} Days</span>
                      </div>
                      <div className="vault-pod-metric">
                        <span className="vault-pod-metric__label">AUTO-TRIGGER</span>
                        <span className="vault-pod-metric__val vault-pod-metric__val--ready">
                          ✓ Midnight Standby
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="vault-pod-card__footer">
                    <span className="vault-pod-card__footer-tag">
                      ⚡ +1 Shield awarded every 7-day personal milestone
                    </span>
                  </div>
                </div>

                {/* 2. Mutual Duo Shared Shield Pod */}
                <div className="vault-pod-card vault-pod-card--duo">
                  <div className="vault-pod-card__header">
                    <div className="vault-pod-card__icon-box vault-pod-card__icon-box--duo">
                      <span>⚡</span>
                    </div>
                    <div className="vault-pod-card__header-info">
                      <span className="vault-pod-card__type">MUTUAL CO-OP</span>
                      <h3>Shared Duo Shield</h3>
                    </div>
                    <div className="vault-pod-card__count-badge vault-pod-card__count-badge--duo">
                      <span>{duo ? `${duoShields} Available` : 'Unpaired'}</span>
                    </div>
                  </div>

                  <div className="vault-pod-card__body">
                    {duo && partner ? (
                      <>
                        <p className="vault-pod-card__desc">
                          Mutual insurance protecting the shared Duo streak with @{partner.username}. If either partner misses a day, a shared shield deploys at midnight.
                        </p>

                        <div className="vault-pod-metrics">
                          <div className="vault-pod-metric">
                            <span className="vault-pod-metric__label">SHARED DUO STREAK</span>
                            <span className="vault-pod-metric__val">⚡ {duo.duoStreak || 0} Days</span>
                          </div>
                          <div className="vault-pod-metric">
                            <span className="vault-pod-metric__label">PARTNER LINK</span>
                            <span className="vault-pod-metric__val vault-pod-metric__val--partner">
                              @{partner.username} (Lv {partner.personalLevel || 1})
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="vault-unpaired-box">
                        <p>You do not have an active Duo partner yet. Pair up to unlock shared Duo Streak Shields!</p>
                        <Link to="/dashboard" className="btn btn--primary btn--sm">
                          Pair with Partner
                        </Link>
                      </div>
                    )}
                  </div>

                  {duo && partner && (
                    <div className="vault-pod-card__footer vault-pod-card__footer--actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--danger-hover"
                        onClick={handleSendSOS}
                        disabled={sendingSOS}
                      >
                        <span>🚨</span>
                        <span>{sendingSOS ? 'Dispatching…' : 'Send Emergency SOS Nudge'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Shield Mechanics Guide */}
              <div className="settings-vault-rules">
                <div className="settings-vault-rules__header">
                  <span className="settings-vault-rules__icon">📜</span>
                  <div>
                    <h4 className="settings-vault-rules__title">Vault Mechanics & Protection Rules</h4>
                    <p className="settings-vault-rules__desc">How automated streak preservation operates under the hood.</p>
                  </div>
                </div>

                <div className="settings-vault-rules__grid">
                  <div className="settings-vault-rule-item">
                    <span className="settings-vault-rule-item__num">01</span>
                    <div>
                      <strong>Automated Midnight Defense</strong>
                      <p>At 23:59:59 each night, if unchecked habits remain, an active shield auto-consumes to preserve continuity.</p>
                    </div>
                  </div>
                  <div className="settings-vault-rule-item">
                    <span className="settings-vault-rule-item__num">02</span>
                    <div>
                      <strong>7-Day Milestone Recharges</strong>
                      <p>Every 7 uninterrupted consecutive days completed without shield usage awards +1 Bonus Shield.</p>
                    </div>
                  </div>
                  <div className="settings-vault-rule-item">
                    <span className="settings-vault-rule-item__num">03</span>
                    <div>
                      <strong>Emergency SOS Protocol</strong>
                      <p>Dispatch high-priority SOS push alerts to remind your partner before the cutoff window expires.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 7. Change Password (Dropdown / Accordion) ── */}
        <section className={`settings-card settings-accordion ${isPasswordOpen ? 'settings-accordion--open' : ''}`}>
          <button
            type="button"
            className="settings-accordion__trigger"
            onClick={() => setIsPasswordOpen((prev) => !prev)}
            aria-expanded={isPasswordOpen}
          >
            <div className="settings-accordion__title-wrap">
              <div className="settings-card__icon-wrap">
                <span aria-hidden="true">🔑</span>
              </div>
              <div className="settings-accordion__labels">
                <h2 className="settings-card__title">Change Password</h2>
                <p className="settings-card__desc">Update your login security credentials.</p>
              </div>
            </div>
            <div className="settings-accordion__meta">
              <span className="settings-accordion__tag">Security</span>
              <span className={`settings-accordion__chevron ${isPasswordOpen ? 'settings-accordion__chevron--open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </div>
          </button>

          {isPasswordOpen && (
            <div className="settings-accordion__body">
              <form onSubmit={handleChangePassword} className="settings-password-form">
                {/* Field 1: Existing Password */}
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="existing-password">
                    Existing Password <span className="settings-required">*</span>
                  </label>
                  <div className="settings-password-input-wrap">
                    <input
                      id="existing-password"
                      type={showExistingPassword ? 'text' : 'password'}
                      className="settings-input settings-input--password"
                      value={existingPassword}
                      onChange={(e) => setExistingPassword(e.target.value)}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="settings-eye-btn"
                      onClick={() => setShowExistingPassword((prev) => !prev)}
                      aria-label={showExistingPassword ? 'Hide password' : 'Show password'}
                      title={showExistingPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showExistingPassword} />
                    </button>
                  </div>
                </div>

                {/* Field 2: New Password */}
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="new-password">
                    New Password <span className="settings-required">*</span>
                  </label>
                  <div className="settings-password-input-wrap">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className="settings-input settings-input--password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="settings-eye-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showNewPassword} />
                    </button>
                  </div>
                  <span className="settings-form-hint">Must be at least 8 characters long.</span>
                </div>

                {/* Field 3: Confirm New Password */}
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="confirm-new-password">
                    Confirm New Password <span className="settings-required">*</span>
                  </label>
                  <div className="settings-password-input-wrap">
                    <input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      className="settings-input settings-input--password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-type your new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="settings-eye-btn"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showConfirmNewPassword} />
                    </button>
                  </div>
                </div>

                {/* Status message */}
                {passwordMsg && (
                  <div className={`settings-alert ${passwordStatus === 'error' ? 'settings-alert--danger' : 'settings-alert--success'}`}>
                    <span className="settings-alert__icon">{passwordStatus === 'error' ? '❌' : '✅'}</span>
                    <span>{passwordMsg}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setIsPasswordOpen(false);
                      setPasswordMsg('');
                      setExistingPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    disabled={passwordStatus === 'loading'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary btn--sm"
                    disabled={passwordStatus === 'loading'}
                  >
                    {passwordStatus === 'loading' ? 'Updating Password…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* ── 8. Delete Account (Dropdown / Accordion - Danger Zone) ── */}
        <section className={`settings-card settings-accordion settings-accordion--danger ${isDeleteOpen ? 'settings-accordion--open' : ''}`}>
          <button
            type="button"
            className="settings-accordion__trigger settings-accordion__trigger--danger"
            onClick={() => setIsDeleteOpen((prev) => !prev)}
            aria-expanded={isDeleteOpen}
          >
            <div className="settings-accordion__title-wrap">
              <div className="settings-card__icon-wrap settings-card__icon-wrap--danger">
                <span aria-hidden="true">🗑️</span>
              </div>
              <div className="settings-accordion__labels">
                <h2 className="settings-card__title settings-card__title--danger">Delete Account</h2>
                <p className="settings-card__desc">Permanently erase your account, solo habits, and duo partnerships.</p>
              </div>
            </div>
            <div className="settings-accordion__meta">
              <span className="settings-danger-badge">Permanent Action</span>
              <span className={`settings-accordion__chevron ${isDeleteOpen ? 'settings-accordion__chevron--open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </div>
          </button>

          {isDeleteOpen && (
            <div className="settings-accordion__body settings-accordion__body--danger">
              <div className="settings-danger-warning">
                <div className="settings-danger-warning__icon">⚠️</div>
                <div className="settings-danger-warning__text">
                  <strong>Warning: This action is irreversible.</strong>
                  <p>
                    Deleting your account will permanently wipe your user profile, all tracked habits, solo and duo streaks,
                    shield inventory, and notifications from our database. To proceed, confirm by entering your current password twice below.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="settings-delete-form">
                {/* Field 1: Current Password */}
                <div className="settings-form-group">
                  <label className="settings-form-label settings-form-label--danger" htmlFor="delete-password-1">
                    Enter Current Password <span className="settings-required">*</span>
                  </label>
                  <div className="settings-password-input-wrap">
                    <input
                      id="delete-password-1"
                      type={showDeletePassword1 ? 'text' : 'password'}
                      className="settings-input settings-input--danger settings-input--password"
                      value={deletePassword1}
                      onChange={(e) => setDeletePassword1(e.target.value)}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="settings-eye-btn settings-eye-btn--danger"
                      onClick={() => setShowDeletePassword1((prev) => !prev)}
                      aria-label={showDeletePassword1 ? 'Hide password' : 'Show password'}
                      title={showDeletePassword1 ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showDeletePassword1} />
                    </button>
                  </div>
                </div>

                {/* Field 2: Confirm Current Password */}
                <div className="settings-form-group">
                  <label className="settings-form-label settings-form-label--danger" htmlFor="delete-password-2">
                    Re-enter Current Password to Confirm <span className="settings-required">*</span>
                  </label>
                  <div className="settings-password-input-wrap">
                    <input
                      id="delete-password-2"
                      type={showDeletePassword2 ? 'text' : 'password'}
                      className="settings-input settings-input--danger settings-input--password"
                      value={deletePassword2}
                      onChange={(e) => setDeletePassword2(e.target.value)}
                      placeholder="Confirm current password again"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="settings-eye-btn settings-eye-btn--danger"
                      onClick={() => setShowDeletePassword2((prev) => !prev)}
                      aria-label={showDeletePassword2 ? 'Hide password' : 'Show password'}
                      title={showDeletePassword2 ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showDeletePassword2} />
                    </button>
                  </div>
                  <span className="settings-form-hint settings-form-hint--danger">
                    Must match the password entered above exactly.
                  </span>
                </div>

                {/* Status message */}
                {deleteMsg && (
                  <div className="settings-alert settings-alert--danger">
                    <span className="settings-alert__icon">❌</span>
                    <span>{deleteMsg}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeleteMsg('');
                      setDeletePassword1('');
                      setDeletePassword2('');
                    }}
                    disabled={deleteStatus === 'loading'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--danger btn--sm"
                    disabled={deleteStatus === 'loading'}
                  >
                    {deleteStatus === 'loading' ? 'Deleting Account…' : 'Permanently Delete My Account'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
