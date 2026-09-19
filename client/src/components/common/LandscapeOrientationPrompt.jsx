import { useState, useEffect, useCallback } from 'react';

/**
 * LandscapeOrientationPrompt
 *
 * Prompts mobile phone users viewing in portrait mode:
 * 1. "Rotate to view the site in landscape mode" -> switches the project to landscape mode
 * 2. "Preview as it is" -> allows the user to browse in portrait mode
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!sessionStorage.getItem('tg_orientation_choice');
    } catch {
      return false;
    }
  });
  const [currentMode, setCurrentMode] = useState(() => {
    try {
      return sessionStorage.getItem('tg_orientation_choice') || 'auto';
    } catch {
      return 'auto';
    }
  });

  const checkOrientation = useCallback(() => {
    const portraitMql = window.matchMedia('(orientation: portrait)');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileWidth = window.innerWidth <= 1024;

    const portrait = portraitMql.matches;
    const mobile = isMobileWidth || isTouch;

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // If device is physically in landscape mode, remove any forced portrait/landscape CSS rotation
    if (!portrait) {
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
    }
  }, []);

  useEffect(() => {
    checkOrientation();

    const portraitMql = window.matchMedia('(orientation: portrait)');
    const update = () => checkOrientation();

    if (portraitMql.addEventListener) {
      portraitMql.addEventListener('change', update);
    } else {
      portraitMql.addListener(update);
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    // If previously selected landscape mode, restore landscape view
    try {
      const savedChoice = sessionStorage.getItem('tg_orientation_choice');
      if (savedChoice === 'landscape') {
        document.documentElement.classList.add('landscape-mode');
        document.body.classList.add('landscape-mode');
      } else if (savedChoice === 'portrait') {
        document.documentElement.classList.remove('landscape-mode');
        document.body.classList.remove('landscape-mode');
        document.documentElement.classList.remove('desktop-site-view');
        document.documentElement.classList.remove('app-forced-landscape');
        document.body.classList.remove('app-forced-landscape');
      }
    } catch {}

    return () => {
      if (portraitMql.removeEventListener) {
        portraitMql.removeEventListener('change', update);
      } else {
        portraitMql.removeListener(update);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [checkOrientation]);

  // Option 1: Rotate to view the site in landscape mode
  const handleRotateLandscape = async () => {
    // 1. Attempt Screen Orientation Lock without entering intrusive browser fullscreen mode
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
    } catch {}

    // 2. Apply landscape layout mode
    try {
      sessionStorage.setItem('tg_orientation_choice', 'landscape');
    } catch {}

    document.documentElement.classList.add('landscape-mode');
    document.body.classList.add('landscape-mode');
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');

    setCurrentMode('landscape');
    setDismissed(true);
  };

  // Option 2: Preview as it is (stay in portrait mode)
  const handlePreviewAsItIs = () => {
    try {
      sessionStorage.setItem('tg_orientation_choice', 'portrait');
    } catch {}

    const vp = document.getElementById('app-viewport') || document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    document.documentElement.classList.remove('landscape-mode');
    document.body.classList.remove('landscape-mode');
    document.documentElement.classList.remove('desktop-site-view');
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');

    setCurrentMode('portrait');
    setDismissed(true);
  };

  // Allow re-opening from FAB button
  const handleOpenPrompt = () => {
    setDismissed(false);
  };

  // Should we show the orientation popup?
  const showModal = isPortrait && isMobileDevice && !dismissed;

  return (
    <>
      {/* Main Orientation Modal */}
      {showModal && (
        <div className="landscape-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="landscape-prompt-title">
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

      {/* Floating Orientation Quick-Toggle (visible on mobile after modal is dismissed) */}
      {isMobileDevice && dismissed && (
        <button
          type="button"
          className="orientation-toggle-fab"
          onClick={handleOpenPrompt}
          title="Change screen orientation"
          aria-label="Change screen orientation"
          id="btn-orientation-toggle-fab"
        >
          <span className="orientation-toggle-fab__icon">🔄</span>
          <span className="orientation-toggle-fab__text">
            {currentMode === 'landscape' ? 'Landscape' : 'Rotate'}
          </span>
        </button>
      )}
    </>
  );
}
