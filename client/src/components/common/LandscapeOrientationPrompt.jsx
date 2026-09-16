import { useState, useEffect } from 'react';

/**
 * LandscapeOrientationPrompt
 *
 * Automatically detects when a mobile/tablet user is viewing in portrait mode
 * and provides guidance and screen-orientation lock to view TwoGether horizontally.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Attempt native Screen Orientation API lock
    const attemptLock = async () => {
      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch {
        // Many browsers require fullscreen or user gesture, handled below
      }
    };

    attemptLock();

    // Check media query for mobile/tablet in portrait orientation
    const mql = window.matchMedia('(max-width: 1024px) and (orientation: portrait)');

    const updateOrientation = (e) => {
      setIsPortrait(e.matches);
    };

    setIsPortrait(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', updateOrientation);
    } else {
      mql.addListener(updateOrientation);
    }

    // Also re-attempt lock on user touch/click
    const handleGesture = () => {
      attemptLock();
    };
    window.addEventListener('touchstart', handleGesture, { once: true });
    window.addEventListener('click', handleGesture, { once: true });

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateOrientation);
      } else {
        mql.removeListener(updateOrientation);
      }
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, []);

  const handleFullscreenLock = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock('landscape');
      }
    } catch {
      // Handled by physical rotation
    }
  };

  if (!isPortrait || dismissed) return null;

  return (
    <div className="landscape-prompt-overlay" role="dialog" aria-modal="true">
      <div className="landscape-prompt-card">
        <div className="landscape-prompt-animation">
          <div className="landscape-prompt-phone">
            <div className="landscape-prompt-phone__screen">⚡</div>
          </div>
          <div className="landscape-prompt-arrow">🔄</div>
        </div>

        <h3 className="landscape-prompt-title">Horizontal Preview</h3>
        <p className="landscape-prompt-text">
          <strong>TwoGether</strong> is designed for horizontal widescreen. Please rotate your device to <strong>landscape mode</strong> for habit tracking & duo accountability.
        </p>

        <div className="landscape-prompt-actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleFullscreenLock}
          >
            ⚡ Rotate Screen
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setDismissed(true)}
          >
            Preview Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
