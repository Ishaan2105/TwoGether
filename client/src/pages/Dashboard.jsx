import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDuo } from '../context/DuoContext.jsx';
import { useSidebar } from '../context/SidebarContext.jsx';
import * as duoService from '../services/duo.js';
import WhatsAppShareModal from '../components/common/WhatsAppShareModal.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { duo, partner, loading, lookup, pair, nudge, unpair } = useDuo();
  const { openImageNudge, openNudgeAction } = useSidebar();
  const navigate = useNavigate();

  const [partnerCode, setPartnerCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [imageNudgeNotice, setImageNudgeNotice] = useState(null);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [unpairing, setUnpairing] = useState(false);

  // Synergy Shells State
  const [shellsData, setShellsData] = useState(null);
  const [loadingShells, setLoadingShells] = useState(false);

  const loadShells = useCallback(async () => {
    if (duo && partner) {
      try {
        setLoadingShells(true);
        const data = await duoService.getDuoShells();
        setShellsData(data);
      } catch (err) {
        console.error('Failed to load duo shells:', err);
      } finally {
        setLoadingShells(false);
      }
    }
  }, [duo, partner]);

  useEffect(() => {
    loadShells();
  }, [loadShells]);

  // Listen for image nudge attachment & delivery confirmation
  useEffect(() => {
    const onImageNudgeSent = (e) => {
      const detail = e.detail;
      if (detail?.hasImage) {
        const srcText = detail.source === 'camera' ? 'clicked from Camera' : 'chosen from Gallery';
        setImageNudgeNotice(`Picture ${srcText} attached successfully and delivered to @${detail.partnerName || 'partner'}! 📸`);
        setTimeout(() => setImageNudgeNotice(null), 8000);
      }
    };
    window.addEventListener('twogether:image-nudge-sent', onImageNudgeSent);
    return () => window.removeEventListener('twogether:image-nudge-sent', onImageNudgeSent);
  }, []);

  if (!user) return null;

  const handleCopyCode = () => {
    if (user.duoInviteCode) {
      navigator.clipboard.writeText(user.duoInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = partnerCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter your partner’s Duo code');
      return;
    }

    setError('');
    setLookupResult(null);
    setLookingUp(true);
    try {
      const res = await lookup(cleanCode);
      setLookupResult(res.partner);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to find partner with this code.');
    } finally {
      setLookingUp(false);
    }
  };

  const handlePair = async () => {
    const cleanCode = partnerCode.trim().toUpperCase();
    if (!cleanCode) return;

    setError('');
    setPairing(true);
    try {
      await pair(cleanCode);
      setSuccessMsg('🎉 Duo successfully formed! Welcome to unbreakable accountability.');
      setLookupResult(null);
      setPartnerCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not form Duo. Please try again.');
    } finally {
      setPairing(false);
    }
  };

  const handleSendNudge = async (type) => {
    setSendingNudge(true);
    setError('');
    try {
      const res = await nudge(type);
      setSuccessMsg(`⚡ ${res.message || 'Nudge sent!'}`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send nudge.');
    } finally {
      setSendingNudge(false);
    }
  };

  const handleUnpair = async () => {
    if (!window.confirm('Are you sure you want to unlink from your Duo partner?')) return;
    setUnpairing(true);
    setError('');
    try {
      await unpair();
      setSuccessMsg('Duo has been unlinked.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlink Duo.');
    } finally {
      setUnpairing(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="container dashboard">
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

        {/* Dynamic State: Paired vs Unpaired */}
        {duo && partner ? (
          /* ======================================================== */
          /* PAIRED STATE: ACTIVE DUO HUB                             */
          /* ======================================================== */
          <section className="card duo-hub">
            <div className="duo-hub__header">
              <div>
                <span className="badge badge--solaris-active">ACTIVE DUO</span>
                <h2>{duo.duoName}</h2>
                <p className="muted">
                  Paired on {new Date(duo.formedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
              <div className="duo-hub__header-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--unlink-duo"
                  onClick={handleUnpair}
                  disabled={unpairing}
                >
                  {unpairing ? 'Unlinking…' : 'Unlink Duo'}
                </button>
              </div>
            </div>

            {/* Dual Partner Connection Aura Bridge */}
            <div className="duo-bridge">
              <div className="duo-member duo-member--user">
                <div className="duo-member__avatar" aria-hidden="true">
                  <span>{(user.username?.[0] || 'U').toUpperCase()}</span>
                </div>
                <div className="duo-member__info">
                  <strong>You (@{user.username})</strong>
                  <span>Lvl {user.personalLevel} · {user.soloStreak}d solo streak</span>
                </div>
              </div>

              <div className="duo-bridge__link">
                <span className="duo-bridge__tag">MUTUAL STAKES</span>
              </div>

              <div className="duo-member duo-member--partner">
                <div className="duo-member__info">
                  <strong>@{partner.username}</strong>
                  <span>Lvl {partner.personalLevel} · {partner.customTitle}</span>
                </div>
                <div className="duo-member__avatar" aria-hidden="true">
                  <span>{(partner.username?.[0] || 'P').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Duo Shared Metrics Grid */}
            <div className="duo-stats-grid">
              <div className="duo-stat-card duo-stat-card--streak">
                <div className="duo-stat-card__icon" aria-hidden="true">🔥</div>
                <div className="duo-stat-card__content">
                  <span className="duo-stat-card__label">DUO STREAK</span>
                  <span className="duo-stat-card__value">{duo.duoStreak} Days</span>
                  <span className="duo-stat-card__sub">Best: {duo.highestStreak}d</span>
                </div>
              </div>

              <div className="duo-stat-card duo-stat-card--synergy">
                <div className="duo-stat-card__icon" aria-hidden="true">⚡</div>
                <div className="duo-stat-card__content">
                  <span className="duo-stat-card__label">SYNERGY SCORE</span>
                  <span className="duo-stat-card__value">{duo.synergyScore}%</span>
                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{ width: `${duo.synergyScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="duo-stat-card duo-stat-card--shields">
                <div className="duo-stat-card__icon" aria-hidden="true">🛡️</div>
                <div className="duo-stat-card__content">
                  <span className="duo-stat-card__label">DUO SHIELDS</span>
                  <span className="duo-stat-card__value">{duo.duoShields} Active</span>
                  <span className="duo-stat-card__sub">Streak protection ready</span>
                </div>
              </div>

              <div className="duo-stat-card duo-stat-card--level">
                <div className="duo-stat-card__icon" aria-hidden="true">👑</div>
                <div className="duo-stat-card__content">
                  <span className="duo-stat-card__label">DUO LEVEL</span>
                  <span className="duo-stat-card__value">Level {duo.duoLevel}</span>
                  <span className="duo-stat-card__sub">{duo.duoXP} Duo XP</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SHARED DUO SYNERGY SHELLS SECTION                       */}
            {/* ======================================================== */}
            <section className="duo-shells-section">
              <div className="duo-shells-header">
                <div>
                  <div className="duo-shells-badge">
                    <span>MUTUAL SHELLS</span>
                    {shellsData?.stats?.sharedShellCount > 0 && (
                      <span className="badge badge--pill">
                        {shellsData.stats.perfectSynergyShells} / {shellsData.stats.sharedShellCount} Synced Today
                      </span>
                    )}
                  </div>
                  <h3 className="duo-shells-title">Shared Synergy Shells</h3>
                  <p className="duo-shells-desc">
                    Your distinct daily habits automatically linked under shared accountability domains:
                  </p>
                </div>
                <Link to="/tasks" className="btn btn--solaris-cta btn--sm">
                  + Manage My Tasks
                </Link>
              </div>

              {loadingShells ? (
                <div className="spinner-wrap" style={{ padding: '2rem 0', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : shellsData?.sharedShells && shellsData.sharedShells.length > 0 ? (
                <div className="duo-shells-list">
                  {shellsData.sharedShells.map((shell) => (
                    <div
                      key={shell.shellId}
                      className={`duo-shell-card ${
                        shell.isSynergyAchieved ? 'duo-shell-card--perfect' : ''
                      }`}
                    >
                      {/* Shell Header */}
                      <div className="duo-shell-card__header">
                        <div className="duo-shell-card__title-group">
                          <div>
                            <h4>{shell.shellName}</h4>
                            <p className="muted duo-shell-card__desc">{shell.shellDescription}</p>
                          </div>
                        </div>

                        <div className="duo-shell-card__status">
                          {shell.isSynergyAchieved ? (
                            <span className="badge badge--success badge--pulse">
                              PERFECT SYNERGY (100%)
                            </span>
                          ) : shell.totalCompleted > 0 ? (
                            <span className="badge badge--pill">
                              HALFWAY ({shell.totalCompleted}/{shell.totalTasks})
                            </span>
                          ) : (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              PENDING BOTH (0/{shell.totalTasks})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Side-by-Side Individual Tasks */}
                      <div className="duo-shell-tasks-grid">
                        {/* Your Tasks Column */}
                        <div className="duo-shell-col">
                          <div className="duo-shell-col__label">
                            <strong>Your Tasks:</strong>
                          </div>
                          <div className="duo-shell-col__items">
                            {shell.userATasks.map((t) => (
                              <div
                                key={t._id}
                                className={`duo-shell-task-item ${
                                  t.isCompletedToday ? 'duo-shell-task-item--done' : ''
                                }`}
                              >
                                <span className="duo-shell-task-item__title">{t.title}</span>
                                <span
                                  className={`duo-shell-task-status ${
                                    t.isCompletedToday ? 'duo-shell-task-status--done' : ''
                                  }`}
                                >
                                  {t.isCompletedToday ? '✓ Done' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Connection Bridge Center */}
                        <div className="duo-shell-connector" aria-hidden="true">
                          —
                        </div>

                        {/* Partner Tasks Column */}
                        <div className="duo-shell-col duo-shell-col--partner">
                          <div className="duo-shell-col__label">
                            <strong>@{partner.username}’s Tasks:</strong>
                          </div>
                          <div className="duo-shell-col__items">
                            {shell.userBTasks.map((t) => (
                              <div
                                key={t._id}
                                className={`duo-shell-task-item ${
                                  t.isCompletedToday ? 'duo-shell-task-item--done' : ''
                                }`}
                              >
                                <span className="duo-shell-task-item__title">{t.title}</span>
                                <span
                                  className={`duo-shell-task-status ${
                                    t.isCompletedToday ? 'duo-shell-task-status--done' : ''
                                  }`}
                                >
                                  {t.isCompletedToday ? '✓ Done' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {!shell.isUserBDone && (
                            <button
                              type="button"
                              className="btn btn--ghost btn--xs"
                              style={{ marginTop: '0.4rem', alignSelf: 'flex-start' }}
                              onClick={() => openNudgeAction('nudge')}
                            >
                              Nudge to complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card duo-shells-empty">
                  <h4 className="duo-shells-empty-title">No overlapping task shells yet</h4>
                  <p className="duo-shells-empty-desc">
                    When you and @{partner.username} both have habits in matching domains (like Exercise, Hydration, or Reading), the system will automatically fuse them into Shared Synergy Shells here!
                  </p>
                  <Link to="/tasks" className="btn btn--primary btn--sm">
                    + Add Daily Habits
                  </Link>
                </div>
              )}

              {/* Solo Habits Section */}
              {shellsData?.soloShells && shellsData.soloShells.length > 0 && (
                <div className="duo-solo-section">
                  <h4 className="duo-solo-title">Individual / Solo Habits ({shellsData.soloShells.length})</h4>
                  <p className="duo-solo-desc">
                    Tasks currently unique to one partner. Add matching habits to turn them into shared synergy shells!
                  </p>
                  <div className="duo-solo-grid">
                    {shellsData.soloShells.map((solo) => (
                      <div key={solo.shellId} className="duo-solo-card">
                        <div className="duo-solo-card__info">
                          <strong>{solo.shellName}</strong>
                          <span>
                            {solo.userATasks.length > 0
                              ? `You: "${solo.userATasks[0].title}"`
                              : `@${partner.username}: "${solo.userBTasks[0].title}"`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Live Interactive Nudges */}
            <div className="duo-nudges-section">
              <h3>Real-Time Accountability Nudges</h3>
              <p className="muted">
                Send an instant pulse or screenshot-proof photo to @{partner.username} to keep the momentum going:
              </p>
              <div className="duo-nudge-buttons">
                <button
                  type="button"
                  className="duo-nudge-btn"
                  onClick={openImageNudge}
                  title="Capture camera photo or select gallery image"
                >
                  <span className="duo-nudge-btn__icon">📸</span>
                  <span className="duo-nudge-btn__label">Send Image Nudge</span>
                </button>
                <button
                  type="button"
                  className="duo-nudge-btn"
                  onClick={() => openNudgeAction('hype')}
                  title="Send energetic hype and celebration to partner"
                >
                  <span className="duo-nudge-btn__icon">⚡</span>
                  <span className="duo-nudge-btn__label">Send Hype</span>
                </button>
                <button
                  type="button"
                  className="duo-nudge-btn"
                  onClick={() => openNudgeAction('nudge')}
                  title="Send accountability nudge and reminder"
                >
                  <span className="duo-nudge-btn__icon">🔔</span>
                  <span className="duo-nudge-btn__label">Nudge Partner</span>
                </button>
                <button
                  type="button"
                  className="duo-nudge-btn"
                  onClick={() => openNudgeAction('sos')}
                  title="Trigger high-urgency Emergency SOS alert & email"
                >
                  <span className="duo-nudge-btn__icon">🚨</span>
                  <span className="duo-nudge-btn__label">Emergency SOS</span>
                </button>
              </div>

              {/* Picture Attached Live Confirmation Alert */}
              {imageNudgeNotice && (
                <div className="duo-image-attached-alert" role="status">
                  <span className="duo-image-attached-alert__icon">✅</span>
                  <div className="duo-image-attached-alert__content">
                    <strong>Picture Attached Successfully!</strong>
                    <span>{imageNudgeNotice}</span>
                  </div>
                </div>
              )}

              {/* Nudge Activity Feed */}
              {duo.nudges && duo.nudges.length > 0 && (
                <div className="duo-nudge-feed">
                  <h4>Recent Activity</h4>
                  <div className="nudge-list">
                    {duo.nudges
                      .slice(-4)
                      .reverse()
                      .map((n, i) => (
                        <div key={n._id || i} className="nudge-item">
                          <span className={`nudge-item__badge ${n.type === 'image' ? 'nudge-item__badge--photo' : ''}`}>
                            {n.type === 'image' ? 'PHOTO' : n.type === 'hype' ? 'HYPE' : n.type === 'sos' ? 'SOS' : 'NUDGE'}
                          </span>
                          <span className="nudge-item__text">
                            {n.sender === user._id ? 'You' : `@${partner.username}`}{' '}
                            {n.type === 'image' ? 'attached a picture & sent a photo nudge' : `sent a ${n.type}`}
                          </span>
                          <span className="nudge-item__time">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ======================================================== */
          /* UNPAIRED STATE: PAIRING HUB                              */
          /* ======================================================== */
          <div className="duo-pairing-grid">
            {/* Left Card: Share Your Code */}
            <section className="card duo-code-card">
              <div className="card__header">
                <h2>Your Duo Invite Code</h2>
              </div>
              <p>
                Give this code to your accountability partner so they can connect with you:
              </p>
              <div className="duo-code" aria-label="Your Duo invite code">
                <span className="duo-code__label">YOUR CODE</span>
                <span className="duo-code__value">{user.duoInviteCode}</span>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--block"
                onClick={handleCopyCode}
              >
                {copied ? 'COPIED TO CLIPBOARD' : 'COPY INVITE CODE'}
              </button>
              <button
                type="button"
                className="btn btn--whatsapp btn--block"
                style={{ marginTop: '0.65rem' }}
                onClick={() => setShowWhatsAppModal(true)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.1.14 1.44 2.21 3.5 3.1 1.71.74 2.06.6 2.43.56.37-.03 1.2-.49 1.37-.96.17-.48.17-.89.12-.97-.05-.08-.19-.13-.4-.24-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.11-.14.21-.55.68-.67.82-.12.14-.24.16-.45.05-.21-.1-.89-.33-1.69-1.05-.62-.56-1.04-1.25-1.16-1.46-.12-.21-.01-.32.09-.43.09-.1.21-.26.31-.39.11-.13.14-.22.21-.37.07-.15.04-.28-.02-.39-.06-.11-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.41-.14-.01-.3-.01-.46-.01z"/>
                </svg>
                <span>SHARE ON WHATSAPP</span>
              </button>
              <p className="duo-code-card__tip muted">
                Once paired, your streaks and synergy will be linked.
              </p>
            </section>

            {/* Right Card: Enter Partner Code */}
            <section className="card duo-enter-card">
              <div className="card__header">
                <h2>Connect with a Friend</h2>
              </div>
              <p>
                Enter your friend’s Duo Invite Code below to link accounts into a shared Duo:
              </p>

              <form onSubmit={handleLookup} className="duo-enter-form">
                <div className="form-group">
                  <label htmlFor="friendCode">Friend’s Duo Code</label>
                  <div className="input-group">
                    <input
                      id="friendCode"
                      type="text"
                      value={partnerCode}
                      onChange={(e) => {
                        setPartnerCode(e.target.value.toUpperCase());
                        setLookupResult(null);
                        setError('');
                      }}
                      placeholder="e.g. DUO-XXXX"
                      maxLength={12}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn--secondary"
                      disabled={lookingUp || !partnerCode.trim()}
                    >
                      {lookingUp ? 'Checking…' : 'LOOKUP'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Partner Preview Card */}
              {lookupResult && (
                <div className="partner-preview">
                  <div className="partner-preview__details">
                    <h3>@{lookupResult.username}</h3>
                    <p className="muted">
                      Level {lookupResult.personalLevel} · {lookupResult.customTitle} · {' '}
                      {lookupResult.soloStreak}d solo streak
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    onClick={handlePair}
                    disabled={pairing}
                  >
                    {pairing ? 'CONNECTING…' : `PAIR WITH @${lookupResult.username}`}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* WhatsApp Share Modal (Text or Image Card) */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        inviteCode={user?.duoInviteCode}
        username={user?.username}
      />
    </div>
  );
}