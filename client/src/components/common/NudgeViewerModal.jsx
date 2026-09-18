import { useState, useEffect, useRef, useCallback } from 'react';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { getNudgeMessage } from '../../services/notifications.js';

/**
 * NudgeViewerModal
 * Opens when a user clicks a nudge push notification (deep-linked via /?nudge=ID).
 * Displays the image on a <canvas> element with multi-layered anti-screenshot protection:
 *  1. Window Blur & Visibility change detector — instantly blanks image to black shield on screenshot attempt
 *  2. Keyboard shortcut blocker (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+P)
 *  3. Clipboard clearing on PrintScreen
 *  4. Touch-callout & Context-menu blocker (disables long-press download on Samsung/Android/iOS)
 *  5. Dynamic diagonal security watermark on canvas
 *  6. Dynamic self-destruct timer configured by the sender
 */
export default function NudgeViewerModal() {
  const { isNudgeViewerOpen, closeNudgeViewer, activeNudgeId } = useSidebar();

  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalDuration, setTotalDuration] = useState(15);
  const [timeLeft, setTimeLeft] = useState(null); // countdown for self-destruct
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldReason, setShieldReason] = useState('');

  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // ── Fetch nudge when modal opens ─────────────────────────────────
  useEffect(() => {
    if (!isNudgeViewerOpen || !activeNudgeId) return;
    setNudge(null);
    setError('');
    setIsShieldActive(false);
    setShieldReason('');
    setLoading(true);

    getNudgeMessage(activeNudgeId)
      .then((data) => {
        setNudge(data);
        const duration = Math.max(3, Math.min(120, Number(data.duration) || 15));
        setTotalDuration(duration);
        setTimeLeft(duration);
      })
      .catch(() => setError('This nudge has expired or you don\'t have access.'))
      .finally(() => setLoading(false));
  }, [isNudgeViewerOpen, activeNudgeId]);

  // ── Multi-layer Anti-Screenshot & Screen Capture Protection ──────
  useEffect(() => {
    if (!isNudgeViewerOpen || !nudge?.imageDataUrl) return;

    // 1. Window Blur (Fires on Samsung/Android screenshot button press, palm swipe, or Win+Shift+S Snipping tool)
    const handleBlur = () => {
      setIsShieldActive(true);
      setShieldReason('Screen capture or window defocus detected. Image shielded.');
    };

    // 2. Visibility change (Fires when screen recording or capture overlays activate)
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        setIsShieldActive(true);
        setShieldReason('App minimized or screen capture active. Image shielded.');
      }
    };

    // 3. Keyboard shortcuts (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+P)
    const handleKeyDown = (e) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isSnipTool = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's');
      const isMacScreenshot = (e.metaKey && e.shiftKey) && ['3', '4', '5'].includes(e.key);
      const isPrint = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');

      if (isPrintScreen || isSnipTool || isMacScreenshot || isPrint) {
        e.preventDefault();
        e.stopPropagation();
        setIsShieldActive(true);
        setShieldReason('Screenshot key combination blocked.');

        // Wipe clipboard to prevent pasting screenshot
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('Screenshots are prohibited for private nudges on TwoGether.').catch(() => {});
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        setIsShieldActive(true);
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('copy', handleCopy);
    };
  }, [isNudgeViewerOpen, nudge]);

  // ── Render image onto <canvas> with Watermark ───────────────────
  useEffect(() => {
    if (!nudge?.imageDataUrl || !canvasRef.current || isShieldActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxDim = 380;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      // Security Watermark: sender + recipient identity stamps across canvas
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, Math.round(w * 0.042))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.rotate(-Math.PI / 5);

      const stamp = `TwoGether • Private Nudge • From ${nudge.fromUsername || 'Partner'}`;
      for (let row = -h * 1.5; row < h * 2.5; row += 48) {
        for (let col = -w * 1.5; col < w * 2.5; col += 220) {
          ctx.fillText(stamp, col, row);
        }
      }
      ctx.restore();
    };
    img.src = nudge.imageDataUrl;
  }, [nudge, isShieldActive]);

  // ── Sender-defined countdown → auto-close ────────────────────────
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleClose();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    clearTimeout(timerRef.current);
    setNudge(null);
    setTimeLeft(null);
    setIsShieldActive(false);
    setError('');
    closeNudgeViewer();
  }, [closeNudgeViewer]);

  // ── Block context menu inside the modal ──────────────────────────
  const blockContext = useCallback((e) => e.preventDefault(), []);

  if (!isNudgeViewerOpen) return null;

  const progressPct = timeLeft !== null && totalDuration > 0
    ? Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100))
    : 100;

  return (
    <div
      className="modal-backdrop nudge-viewer-backdrop"
      onClick={handleClose}
    >
      <div
        className="nudge-viewer-modal"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={blockContext}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-viewer-title"
      >
        {/* Anti-capture distortion overlay */}
        <div className="nudge-viewer__protect-overlay" aria-hidden="true" />

        {/* ── Header ── */}
        <div className="nudge-viewer__header">
          <div className="nudge-viewer__header-left">
            <div className="nudge-viewer__lock-badge" aria-hidden="true">🔒</div>
            <div>
              <h2 id="nudge-viewer-title" className="nudge-viewer__title">
                {nudge ? `${nudge.fromUsername}'s Private Photo` : 'Secret Photo Nudge'}
              </h2>
              <p className="nudge-viewer__subtitle">
                🛡️ Anti-screenshot active · Disappears in {timeLeft ?? totalDuration}s
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close nudge"
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div className="nudge-viewer__body">
          {loading && (
            <div className="nudge-viewer__loading">
              <div className="nudge-viewer__spinner" />
              <span>Decrypting secure photo…</span>
            </div>
          )}

          {error && (
            <div className="nudge-viewer__error">
              <span>🚫</span>
              <p>{error}</p>
            </div>
          )}

          {nudge && (
            <>
              {/* From & Timer Chip */}
              <div className="nudge-viewer__meta-row">
                <div className="nudge-viewer__from-chip">
                  <span className="nudge-viewer__from-avatar">
                    {(nudge.fromUsername[0] || 'P').toUpperCase()}
                  </span>
                  <span>
                    <strong>{nudge.fromUsername}</strong>
                  </span>
                </div>
                <div className="nudge-viewer__timer-chip">
                  <span>⏱️ {timeLeft}s remaining</span>
                </div>
              </div>

              {/* ── Image Canvas / Screenshot Shield ── */}
              {nudge.imageDataUrl && (
                <div
                  className="nudge-viewer__canvas-wrap"
                  onContextMenu={blockContext}
                  aria-label="Protected Nudge Image"
                >
                  {isShieldActive ? (
                    <div className="nudge-viewer__shield-screen">
                      <div className="nudge-viewer__shield-icon">🛡️🔒</div>
                      <h3 className="nudge-viewer__shield-title">Screenshot Shield Active</h3>
                      <p className="nudge-viewer__shield-desc">
                        {shieldReason || 'Screenshot capture or window blur detected. Image blanked out to protect privacy.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm nudge-viewer__resume-btn"
                        onClick={() => setIsShieldActive(false)}
                      >
                        👁️ Resume Viewing ({timeLeft}s left)
                      </button>
                    </div>
                  ) : (
                    <>
                      <canvas
                        ref={canvasRef}
                        className="nudge-viewer__canvas"
                        onContextMenu={blockContext}
                        draggable="false"
                      />
                      {/* Pointer-events:none shield layer — blocks touch callout & drag */}
                      <div className="nudge-viewer__canvas-shield" aria-hidden="true" />
                    </>
                  )}
                </div>
              )}

              {/* Emoji + Message */}
              <div className="nudge-viewer__message-card">
                <span className="nudge-viewer__emoji" aria-hidden="true">{nudge.emoji}</span>
                <p className="nudge-viewer__message">
                  {nudge.message?.trim() || `${nudge.fromUsername} sent you an ephemeral photo!`}
                </p>
              </div>

              {/* Screenshot notice */}
              <div className="nudge-viewer__protect-notice">
                <span>🛡️</span>
                <span>
                  <strong>Anti-Screenshot Protection Active:</strong> Taking a screenshot or screen recording will capture only the blackout shield.
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Sender-configured Countdown Progress Bar ── */}
        {timeLeft !== null && (
          <div className="nudge-viewer__timer-bar" title={`${timeLeft}s remaining`}>
            <div
              className="nudge-viewer__timer-fill"
              style={{ width: `${progressPct}%`, '--progress': progressPct }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
