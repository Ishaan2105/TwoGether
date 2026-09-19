import { useState, useEffect, useCallback } from 'react';

function getIsPortrait() {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(orientation: portrait)');
  if (mql && typeof mql.matches === 'boolean') {
    return mql.matches;
  }
  return window.innerHeight >= window.innerWidth;
}

function getIsMobileDevice() {
  if (typeof window === 'undefined') return false;
  const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 1024;
  return isMobileUA || isTouch || isSmallScreen;
}

/**
 * LandscapeOrientationPrompt
 *
 * Immediately shows on initial load whenever viewing on mobile in portrait mode:
 * 1. "Rotate to view the site in landscape mode" -> switches to landscape mode
 * 2. "Preview as it is" -> allows the user to browse in portrait mode
 *
 * Whenever the device is in portrait mode or rotates back into portrait mode,
 * the prompt is shown.
 */
export default function LandscapeOrientationPrompt() {
  // Synchronous initialization so modal renders immediately on load with ZERO delay/flicker
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);
  const [dismissed, setDismissed] = useState(false);

  const checkOrientation = useCallback(() => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // If device is in landscape mode, clean up any forced portrait/landscape CSS rotation
    if (!portrait) {
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
      // When rotated physically to landscape, reset dismissed state
      // so if the user rotates back to portrait later, the prompt will be seen again
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    checkOrientation();

    const portraitMql = window.matchMedia('(orientation: portrait)');
    const update = () => checkOrientation();

    if (portraitMql.addEventListener) {
      portraitMql.addEventListener('change', update);
    } else if (portraitMql.addListener) {
      portraitMql.addListener(update);
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      if (portraitMql.removeEventListener) {
        portraitMql.removeEventListener('change', update);
      } else if (portraitMql.removeListener) {
        portraitMql.removeListener(update);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [checkOrientation]);

  // Option 1: Rotate to view the site in landscape mode
  const handleRotateLandscape = async () => {
    // 1. Android Chrome strictly requires a fullscreen context before allowing screen.orientation.lock()
    try {
      const doc = document.documentElement;
      if (doc.requestFullscreen) {
        await doc.requestFullscreen().catch(() => {});
      } else if (doc.webkitRequestFullscreen) {
        await doc.webkitRequestFullscreen().catch(() => {});
      } else if (doc.mozRequestFullScreen) {
        await doc.mozRequestFullScreen().catch(() => {});
      } else if (doc.msRequestFullscreen) {
        await doc.msRequestFullscreen().catch(() => {});
      }
    } catch {}

    // 2. Lock screen orientation to landscape
    try {
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock('landscape').catch(() => {});
      } else if (window.screen?.lockOrientation) {
        window.screen.lockOrientation('landscape');
      } else if (window.screen?.webkitLockOrientation) {
        window.screen.webkitLockOrientation('landscape');
      } else if (window.screen?.mozLockOrientation) {
        window.screen.mozLockOrientation('landscape');
      }
    } catch (err) {
      console.warn('Orientation lock error:', err);
    }

    // 3. Apply landscape layout mode
    document.documentElement.classList.add('landscape-mode');
    document.body.classList.add('landscape-mode');
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');

    setDismissed(true);
  };

  // Option 2: Preview as it is (stay in portrait mode)
  const handlePreviewAsItIs = () => {
    const vp = document.getElementById('app-viewport') || document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    document.documentElement.classList.remove('landscape-mode');
    document.body.classList.remove('landscape-mode');
    document.documentElement.classList.remove('desktop-site-view');
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');

    setDismissed(true);
  };

  // Allow re-opening from quick toggle FAB
  const handleOpenPrompt = () => {
    setDismissed(false);
  };

  // The modal MUST be seen whenever the site is in portrait mode on mobile/touch screen
  const showModal = isPortrait && isMobileDevice && !dismissed;

  return (
    <>
      {/* Main Orientation Modal */}
      {showModal && (
        <div
          className="landscape-prompt-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landscape-prompt-title"
        >
          <div className="landscape-prompt-card">
            <div className="landscape-prompt-animation">
              <div className="landscape-prompt-phone">
                <div className="landscape-prompt-phone__screen">⚡</div>
              </div>
              <div className="landscape-prompt-arrow">🔄</div>
            </div>

            <h3 id="landscape-prompt-title" className="landscape-prompt-title">
              Rotate Device to Landscape
            </h3>
            <p className="landscape-prompt-text">
              <strong>TwoGether</strong> is optimized for horizontal widescreen. Please rotate your phone to <strong>landscape mode</strong> to get the best experience for habit tracking and duo accountability.
            </p>

            <div className="landscape-prompt-actions">
              <button
                type="button"
                className="btn btn--primary landscape-btn-primary"
                onClick={handleRotateLandscape}
                id="btn-rotate-landscape"
              >
                🔄 Rotate to view the site in landscape mode
              </button>
              <button
                type="button"
                className="btn btn--ghost landscape-btn-ghost"
                onClick={handlePreviewAsItIs}
                id="btn-preview-portrait"
              >
                Preview as it is
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Orientation Quick-Toggle (visible on mobile after modal is dismissed in portrait) */}
      {isMobileDevice && isPortrait && dismissed && (
        <button
          type="button"
          className="orientation-toggle-fab"
          onClick={handleOpenPrompt}
          title="Change screen orientation"
          aria-label="Change screen orientation"
          id="btn-orientation-toggle-fab"
        >
          <span className="orientation-toggle-fab__icon">🔄</span>
          <span className="orientation-toggle-fab__text">Rotate</span>
        </button>
      )}
    </>
  );
}
