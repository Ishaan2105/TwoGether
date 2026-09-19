import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useDuo } from '../../context/DuoContext.jsx';

export default function IncomingAlertModal() {
  const { isIncomingAlertOpen, incomingAlertData, closeIncomingAlert } = useSidebar();
  const { partner, nudge } = useDuo();
  const navigate = useNavigate();

  const [hypingBack, setHypingBack] = useState(false);
  const [hypeBackDone, setHypeBackDone] = useState(false);

  const type = incomingAlertData?.type || incomingAlertData?.actionType || 'hype';
  const fromUsername = incomingAlertData?.fromUsername || partner?.username || 'Partner';
  const message = incomingAlertData?.message || '';

  const handleReturnHype = useCallback(async () => {
    if (hypingBack || hypeBackDone) return;
    setHypingBack(true);
    try {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 200, 50, 300]);
      }
      await nudge('hype', '🔥 Returned your mega hype! Let’s crush our synergy today!');
      setHypeBackDone(true);
      setTimeout(() => {
        closeIncomingAlert();
        setHypeBackDone(false);
      }, 1800);
    } catch (err) {
      console.warn('Failed to return hype:', err);
    } finally {
      setHypingBack(false);
    }
  }, [hypingBack, hypeBackDone, nudge, closeIncomingAlert]);

  const handleGoToTasks = useCallback(() => {
    closeIncomingAlert();
    navigate('/tasks');
  }, [closeIncomingAlert, navigate]);

  if (!isIncomingAlertOpen) return null;

  const isHype = type === 'hype';
  const isSOS = type === 'sos';
  const isNudge = type === 'nudge';

  return (
    <div className="modal-backdrop incoming-alert-backdrop" onClick={closeIncomingAlert}>
      <div
        className={`incoming-alert-modal modal-card ${isSOS ? 'incoming-alert-modal--sos' : isHype ? 'incoming-alert-modal--hype' : 'incoming-alert-modal--nudge'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-alert-title"
      >
        {/* Dynamic Animated Particle Beacon */}
        <div className="incoming-alert-particles" aria-hidden="true">
          {isHype && <span className="particle particle--1">⚡</span>}
          {isHype && <span className="particle particle--2">🔥</span>}
          {isHype && <span className="particle particle--3">✨</span>}
          {isSOS && <span className="particle particle--sos-1">🚨</span>}
          {isSOS && <span className="particle particle--sos-2">🛡️</span>}
        </div>

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header__title-group">
            <span className="modal-badge">
              {isSOS ? '🚨 CODE RED • EMERGENCY STREAK ALERT' : isHype ? '⚡ MEGA HYPE PULSE RECEIVED' : '🔔 HABIT CHECK-IN'}
            </span>
            <h2 id="incoming-alert-title" className="incoming-alert-heading">
              {isSOS ? `Emergency SOS from @${fromUsername}!` : isHype ? `@${fromUsername} Hyped You Up! 🚀` : `@${fromUsername} sent you a habit nudge! 🎯`}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeIncomingAlert}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>

        {/* Alert Body */}
        <div className="incoming-alert-body">
          {/* Avatar and Sender Row */}
          <div className="incoming-alert-avatar-row">
            <div className={`incoming-alert-avatar ${isSOS ? 'incoming-alert-avatar--sos' : isHype ? 'incoming-alert-avatar--hype' : ''}`}>
              {(fromUsername[0] || 'P').toUpperCase()}
            </div>
            <div className="incoming-alert-sender-info">
              <strong>@{fromUsername}</strong>
              <span>
                {isSOS
                  ? 'Urgent: Streak cutoff approaching'
                  : isHype
                  ? 'Sent you an electric motivational boost'
                  : 'Accountability partner check-in'}
              </span>
            </div>
          </div>

          {/* Message Card */}
          <div className={`incoming-alert-message-card ${isSOS ? 'incoming-alert-message-card--sos' : ''}`}>
            <span className="incoming-alert-quote-icon">“</span>
            <p className="incoming-alert-quote-text">
              {message || (isSOS
                ? 'Midnight cutoff is approaching! Our joint streak is on the line — please complete your daily habits!'
                : isHype
                ? 'You are crushing it! Keep the momentum going and lock in today’s synergy! 🔥'
                : 'Don’t forget to complete your daily habits & synergy shells today! 🎯')}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="incoming-alert-actions">
            {isHype && (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--hype-back"
                  onClick={handleReturnHype}
                  disabled={hypingBack || hypeBackDone}
                >
                  {hypeBackDone ? '✓ Hype Returned! 🔥' : hypingBack ? 'Firing Hype…' : '⚡ Return Hype to @' + fromUsername}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeIncomingAlert}
                >
                  Let’s Go! 🔥
                </button>
              </>
            )}

            {isNudge && (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--nudge-cta"
                  onClick={handleGoToTasks}
                >
                  🎯 Check-off Daily Tasks →
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeIncomingAlert}
                >
                  Got It! 👍
                </button>
              </>
            )}

            {isSOS && (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--sos-cta"
                  onClick={handleGoToTasks}
                >
                  🛡️ RESCUE STREAK & COMPLETE HABITS →
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeIncomingAlert}
                >
                  I’m On It! 🚨
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
