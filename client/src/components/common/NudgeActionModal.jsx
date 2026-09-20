import { useState, useEffect, useCallback } from 'react';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useDuo } from '../../context/DuoContext.jsx';

const PRESETS = {
  hype: [
    { text: "You're crushing it! Keep the momentum going! 🔥", emoji: '🔥', label: 'Crushing It' },
    { text: 'Unstoppable synergy! Let’s break our streak record! 🚀', emoji: '🚀', label: 'Record Breaker' },
    { text: 'Mega Hype! Beast mode activated today! ⚡', emoji: '⚡', label: 'Beast Mode' },
    { text: 'Streak Legends in the making! Proud of you! 👑', emoji: '👑', label: 'Streak Royalty' },
  ],
  nudge: [
    { text: "Friendly check-in: Don't forget your daily habits today! 🎯", emoji: '🎯', label: 'Daily Habits' },
    { text: 'Midday check-in! Let’s complete our synergy shells! ⏰', emoji: '⏰', label: 'Midday Sync' },
    { text: 'Don’t break our streak chain! You got this! 💪', emoji: '💪', label: 'Streak Shield' },
    { text: 'Let’s finish our habits strong before the evening rush! 🌟', emoji: '🌟', label: 'Finish Strong' },
  ],
  sos: [
    { text: '🚨 Midnight cutoff approaching! Jump in now to save our streak!', emoji: '🚨', label: 'Cutoff Warning' },
    { text: '🛡️ Our streak shield is on the line! Please complete your daily tasks!', emoji: '🛡️', label: 'Shield Alert' },
    { text: '🔥 Code Red! Don’t let our hard-earned joint streak break!', emoji: '🔥', label: 'Code Red' },
  ],
};

export default function NudgeActionModal() {
  const { isNudgeActionOpen, closeNudgeAction, nudgeActionType } = useSidebar();
  const { partner, duo, nudge } = useDuo();

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currentPresets = PRESETS[nudgeActionType] || PRESETS.hype;

  useEffect(() => {
    if (isNudgeActionOpen) {
      setSelectedPreset(0);
      setCustomText('');
      setIsSending(false);
      setSentSuccess(false);
      setFeedbackMsg('');
      setErrorMsg('');
    }
  }, [isNudgeActionOpen, nudgeActionType]);

  const handleSend = async () => {
    if (isSending || !partner) return;
    setIsSending(true);
    setErrorMsg('');

    const finalMessage = customText.trim() || currentPresets[selectedPreset]?.text || '';

    try {
      if (navigator.vibrate) {
        if (nudgeActionType === 'sos') {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } else {
          navigator.vibrate([80, 40, 80]);
        }
      }

      const res = await nudge(nudgeActionType, finalMessage);
      setSentSuccess(true);
      setFeedbackMsg(res.message || 'Dispatched successfully!');

      setTimeout(() => {
        closeNudgeAction();
      }, 2200);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to dispatch alert. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isNudgeActionOpen) return null;

  const partnerName = partner?.username || 'your partner';

  const config = {
    hype: {
      badge: '⚡ MEGA HYPE PULSE',
      title: `Hype Up @${partnerName}`,
      desc: `Send an electric burst of motivation straight to @${partnerName}'s phone with high-energy vibration & visual synergy glow.`,
      btnText: `⚡ FIRE HYPE TO @${partnerName}`,
      themeClass: 'nudge-action-modal--hype',
      btnClass: 'btn--hype',
      icon: '⚡',
    },
    nudge: {
      badge: '🔔 HABIT ACCOUNTABILITY NUDGE',
      title: `Nudge @${partnerName}`,
      desc: `Send a smart habit reminder directly to @${partnerName} to check off daily tasks & lock in joint synergy shells.`,
      btnText: `🔔 DISPATCH HABIT NUDGE`,
      themeClass: 'nudge-action-modal--nudge',
      btnClass: 'btn--nudge',
      icon: '🔔',
    },
    sos: {
      badge: '🚨 CODE RED • EMERGENCY SOS PROTOCOL',
      title: `Emergency Streak SOS to @${partnerName}`,
      desc: `Dispatches an urgent siren push notification AND emergency streak rescue email to @${partnerName}'s inbox so your joint streak isn't lost at midnight.`,
      btnText: `🚨 SOUND EMERGENCY SOS ALARM`,
      themeClass: 'nudge-action-modal--sos',
      btnClass: 'btn--sos',
      icon: '🚨',
    },
  }[nudgeActionType] || {
    badge: '⚡ DUO INTERACTION',
    title: `Notify @${partnerName}`,
    desc: 'Send an instant notification to your partner.',
    btnText: 'Send Alert',
    themeClass: '',
    btnClass: 'btn--primary',
    icon: '⚡',
  };

  return (
    <div className="modal-backdrop" onClick={closeNudgeAction}>
      <div
        className={`nudge-action-modal modal-card ${config.themeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-action-title"
      >
        {/* Glow Beacon Background Effect */}
        <div className="nudge-action-beacon" aria-hidden="true" />

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__title-group">
            <span className="modal-badge">{config.badge}</span>
            <h2 id="nudge-action-title" className="nudge-action-title">
              {config.title}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeNudgeAction}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <p className="modal-description">{config.desc}</p>

        {errorMsg && (
          <div className="alert alert--error" role="alert">
            {errorMsg}
          </div>
        )}

        {sentSuccess ? (
          <div className="nudge-action-success-card" role="status">
            <div className="nudge-action-success-icon">{nudgeActionType === 'sos' ? '🚨' : '✨'}</div>
            <h3>{nudgeActionType === 'sos' ? 'Emergency SOS Dispatched!' : 'Fired Successfully!'}</h3>
            <p>{feedbackMsg}</p>
            {nudgeActionType === 'sos' && (
              <span className="nudge-action-email-tag">✉️ Siren Push + Rescue Email Delivered to @{partnerName}</span>
            )}
          </div>
        ) : (
          <div className="nudge-action-body">
            {/* Presets Grid */}
            <div className="nudge-presets-section">
              <label className="nudge-input-label">Select Quick Prompt or Preset:</label>
              <div className="nudge-presets-grid">
                {currentPresets.map((preset, idx) => {
                  const isSelected = selectedPreset === idx && !customText;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`nudge-preset-btn ${isSelected ? 'nudge-preset-btn--selected' : ''}`}
                      onClick={() => {
                        setSelectedPreset(idx);
                        setCustomText('');
                      }}
                    >
                      <span className="nudge-preset-emoji">{preset.emoji}</span>
                      <div className="nudge-preset-content">
                        <strong>{preset.label}</strong>
                        <span>{preset.text}</span>
                      </div>
                      {isSelected && <span className="nudge-preset-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Message Field */}
            <div className="form-group nudge-custom-group">
              <label htmlFor="nudge-custom-msg" className="nudge-input-label">
                Or Type Custom Note:
              </label>
              <input
                id="nudge-custom-msg"
                type="text"
                className="nudge-custom-input"
                placeholder={currentPresets[selectedPreset]?.text || 'Add your custom message...'}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Emergency SOS High-Urgency Info Bar */}
            {nudgeActionType === 'sos' && (
              <div className="nudge-sos-warning-box">
                <span className="nudge-sos-warning-icon">🛡️</span>
                <div className="nudge-sos-warning-text">
                  <strong>Active Streak Protection:</strong>
                  <span>Your joint streak ({duo?.duoStreak ?? 0} days) is guarded. This alarm alerts @{partnerName} immediately.</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="nudge-action-buttons">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={closeNudgeAction}
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn--primary ${config.btnClass}`}
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? 'Dispatching…' : config.btnText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
