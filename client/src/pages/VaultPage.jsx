import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDuo } from '../context/DuoContext.jsx';

export default function VaultPage() {
  const { user } = useAuth();
  const { duo, partner, nudge } = useDuo();

  const [sendingSOS, setSendingSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [error, setError] = useState('');

  const soloShields = user?.inventory?.streakShields ?? 1;
  const duoShields = duo?.duoShields ?? 1;
  const totalShields = soloShields + (duo ? duoShields : 0);

  const handleSendSOS = async () => {
    if (!duo || !partner) return;
    setSendingSOS(true);
    setError('');
    try {
      await nudge('sos', '🚨 Emergency SOS! Midnight cutoff is approaching — please complete your daily habits!');
      setSosSent(true);
      setTimeout(() => setSosSent(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send SOS notification.');
    } finally {
      setSendingSOS(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="container vault-page">
        {/* Page Hero Header */}
        <section className="vault-hero">
          <div className="vault-hero__content">
            <div className="vault-hero__tag">
              <span className="badge badge--pill">🛡️ STREAK DEFENSE SYSTEM</span>
              <span className="vault-hero__status-badge">
                <span className="vault-hero__status-dot" />
                <span>SHIELD VAULT ONLINE</span>
              </span>
            </div>
            <h1>Streak Shield Vault</h1>
            <p className="vault-hero__subtitle">
              Automated defense protocols protecting your personal solo streak and mutual Duo accountability
              against unexpected offline days or missed cutoffs.
            </p>
          </div>

          <div className="vault-hero__total-card">
            <div className="vault-total-badge">
              <span className="vault-total-badge__icon">🛡️</span>
              <span className="vault-total-badge__num">{totalShields}</span>
            </div>
            <span className="vault-total-badge__label">Total Active Shields</span>
          </div>
        </section>

        {/* Global Notifications */}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        {sosSent && (
          <div className="alert alert--success" role="status">
            🚨 Emergency SOS sent to @{partner?.username}! High-priority notification dispatched.
          </div>
        )}

        {/* Shield Pods Grid */}
        <section className="vault-pods-grid">
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
                Guarantees your personal solo streak if an unexpected event prevents you from checking in
                before midnight.
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
                    Mutual insurance protecting the shared Duo streak with @{partner.username}. If either partner
                    misses a day, a shared shield deploys at midnight.
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
        </section>

        {/* Shield Mechanics Guide Section */}
        <section className="vault-rules-section card">
          <div className="vault-rules-header">
            <span className="vault-rules-header__icon">📜</span>
            <div>
              <h2>Vault Mechanics & Protection Rules</h2>
              <p className="muted">How automated streak preservation operates under the hood.</p>
            </div>
          </div>

          <div className="vault-rules-grid">
            <div className="vault-rule-card">
              <div className="vault-rule-card__num">01</div>
              <h4>Automated Midnight Defense</h4>
              <p>
                At 23:59:59 each night, if you or your partner have unchecked daily habits, an available
                shield automatically consumes itself to preserve streak continuity.
              </p>
            </div>

            <div className="vault-rule-card">
              <div className="vault-rule-card__num">02</div>
              <h4>7-Day Milestone Recharges</h4>
              <p>
                Discipline is rewarded. For every 7 uninterrupted consecutive days completed without
                consuming a shield, your vault automatically recharges with +1 Bonus Shield.
              </p>
            </div>

            <div className="vault-rule-card">
              <div className="vault-rule-card__num">03</div>
              <h4>Emergency SOS Protocol</h4>
              <p>
                Running out of time? Dispatch an instant high-priority SOS notification to your partner's
                phone or desktop to remind them before the cutoff window expires.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
