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
 * Shows when viewing on mobile in portrait mode:
 * 1. "Rotate to view the site in landscape mode" -> Immediately opens back the site,
 *    switches to landscape mode (via fullscreen/orientation lock or simulated CSS rotation),
 *    and displays the entire site ZOOMED OUT.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('twogether_landscape_dismissed') === 'true';
  });
  const [forcedLandscape, setForcedLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('twogether_forced_landscape') === 'true';
  });

  const checkOrientation = useCallback(() => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // If device is in native landscape mode, ensure landscape and zoomed-out classes are active
    if (!portrait) {
      document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
      document.body.classList.add('landscape-mode', 'app-zoomed-out');
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
      setForcedLandscape(false);
      try {
        sessionStorage.removeItem('twogether_forced_landscape');
      } catch (e) {}
    } else {
      // If portrait, check if forced landscape was already requested
      const isSavedForced = sessionStorage.getItem('twogether_forced_landscape') === 'true';
      if (isSavedForced) {
        document.documentElement.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
        document.body.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
        setForcedLandscape(true);
      }
    }
  }, []);

  useEffect(() => {
    // Proactively lock orientation to landscape on load if supported
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

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

  // Action: Rotate to view the site in landscape mode
  const handleRotateLandscape = async () => {
    // 1. Immediately dismiss modal so site opens back up
    setDismissed(true);
    try {
      sessionStorage.setItem('twogether_landscape_dismissed', 'true');
    } catch (e) {}

    // 2. Request fullscreen so screen.orientation.lock has permission to execute on mobile browsers
    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFS) {
      try {
        await requestFS.call(docEl).catch(() => {});
      } catch (e) {}
    }

    // 3. Request native screen orientation lock
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
      console.warn('Orientation lock notice:', err);
    }

    // 4. Always apply landscape-mode and app-zoomed-out
    document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
    document.body.classList.add('landscape-mode', 'app-zoomed-out');

    // 5. If device is still physically held in portrait, activate CSS forced landscape rotation
    const stillPortrait = getIsPortrait();
    if (stillPortrait) {
      document.documentElement.classList.add('app-forced-landscape');
      document.body.classList.add('app-forced-landscape');
      setForcedLandscape(true);
      try {
        sessionStorage.setItem('twogether_forced_landscape', 'true');
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
      setForcedLandscape(false);
      try {
        sessionStorage.removeItem('twogether_forced_landscape');
      } catch (e) {}
    }
  };

  const handleExitForcedLandscape = () => {
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');
    setForcedLandscape(false);
    try {
      sessionStorage.removeItem('twogether_forced_landscape');
    } catch (e) {}
  };

  // Strictly visible when in portrait on mobile and not yet dismissed / not forced
  const showModal = isPortrait && isMobileDevice && !dismissed && !forcedLandscape;

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
            </div>
          </div>
        </div>
      )}

      {/* Floating helper button to exit simulated rotation if active */}
      {forcedLandscape && (
        <button
          type="button"
          className="orientation-toggle-fab"
          onClick={handleExitForcedLandscape}
          title="Exit rotated landscape view"
          id="btn-exit-forced-landscape"
        >
          <span className="orientation-toggle-fab__icon">📱</span>
          <span>Exit Rotated View</span>
        </button>
      )}
    </>
  );
}
