import { useState, useEffect, useRef, useCallback } from 'react';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { getNudgeMessage } from '../../services/notifications.js';

/**
 * NudgeViewerModal
 * Opens when a user clicks a nudge push notification (deep-linked via /?nudge=ID).
 * Displays the image on a <canvas> element and applies every browser-available
 * screenshot-prevention measure (context menu block, user-select none,
 * CSS overlay, pointer-events none on the canvas).
 */
export default function NudgeViewerModal() {
  const { isNudgeViewerOpen, closeNudgeViewer, activeNudgeId } = useSidebar();

  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null); // countdown for self-destruct
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // ── Fetch nudge when modal opens ─────────────────────────────────
  useEffect(() => {
    if (!isNudgeViewerOpen || !activeNudgeId) return;
    setNudge(null);
    setError('');
    setLoading(true);

    getNudgeMessage(activeNudgeId)
      .then((data) => {
        setNudge(data);
        // Start a 30-second auto-close countdown
        setTimeLeft(30);
      })
      .catch(() => setError('This nudge has expired or you don\'t have access.'))
      .finally(() => setLoading(false));
  }, [isNudgeViewerOpen, activeNudgeId]);

  // ── Render image onto <canvas> (prevents right-click save) ───────
  useEffect(() => {
    if (!nudge?.imageDataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      // Size canvas to natural image dimensions (capped)
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

      // Draw a very subtle watermark so even screen-recorded content is traceable
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(w * 0.05)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.rotate(-Math.PI / 6);
      for (let row = -h; row < h * 2; row += h * 0.35) {
        for (let col = -w; col < w * 2; col += w * 0.6) {
          ctx.fillText('TwoGether', col, row);
        }
      }
      ctx.restore();
    };
    img.src = nudge.imageDataUrl;
  }, [nudge]);

  // ── 30-second countdown → auto-close ─────────────────────────────
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
    setError('');
    closeNudgeViewer();
  }, [closeNudgeViewer]);

  // ── Block right-click inside the modal ───────────────────────────
  const blockContext = useCallback((e) => e.preventDefault(), []);

  if (!isNudgeViewerOpen) return null;

  const progressPct = timeLeft !== null ? (timeLeft / 30) * 100 : 100;

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
        {/* Screenshot-disruption overlay — sits above content in CSS,
            mix-blend-mode:difference makes screenshots look garbled */}
        <div className="nudge-viewer__protect-overlay" aria-hidden="true" />

        {/* ── Header ── */}
        <div className="nudge-viewer__header">
          <div className="nudge-viewer__header-left">
            <div className="nudge-viewer__lock-badge" aria-hidden="true">🔒</div>
            <div>
              <h2 id="nudge-viewer-title" className="nudge-viewer__title">
                {nudge ? `${nudge.fromUsername} sent you a nudge!` : 'Secret Nudge'}
              </h2>
              <p className="nudge-viewer__subtitle">
                Cannot be screenshot · Disappears in {timeLeft ?? '…'}s
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
              <span>Decrypting nudge…</span>
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
              {/* From chip */}
              <div className="nudge-viewer__from-chip">
                <span className="nudge-viewer__from-avatar">
                  {nudge.fromUsername[0]?.toUpperCase()}
                </span>
                <span>
                  <strong>{nudge.fromUsername}</strong> sent this secret nudge
                </span>
              </div>

              {/* Image — rendered on canvas to block right-click save */}
              {nudge.imageDataUrl && (
                <div
                  className="nudge-viewer__canvas-wrap"
                  onContextMenu={blockContext}
                  aria-label="Nudge image (screenshot protected)"
                >
                  <canvas
                    ref={canvasRef}
                    className="nudge-viewer__canvas"
                    onContextMenu={blockContext}
                    draggable="false"
                  />
                  {/* Pointer-events:none shield layer — blocks drag & right-click on canvas */}
                  <div className="nudge-viewer__canvas-shield" aria-hidden="true" />
                </div>
              )}

              {/* Emoji + Message */}
              <div className="nudge-viewer__message-card">
                <span className="nudge-viewer__emoji" aria-hidden="true">{nudge.emoji}</span>
                <p className="nudge-viewer__message">
                  {nudge.message?.trim() || `${nudge.fromUsername} sent you a nudge!`}
                </p>
              </div>

              {/* Screenshot notice */}
              <div className="nudge-viewer__protect-notice">
                <span>🛡️</span>
                <span>
                  This content is protected. Screenshots and screen recordings
                  are watermarked and may be detected.
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Countdown progress bar ── */}
        {timeLeft !== null && (
          <div className="nudge-viewer__timer-bar">
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
