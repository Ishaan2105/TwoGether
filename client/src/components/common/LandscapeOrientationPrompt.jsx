import { useState, useEffect, useCallback } from 'react';

function getIsPortrait() {
  if (typeof window === 'undefined') return false;
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('portrait');
  }
  const mql = window.matchMedia?.('(orientation: portrait)');
  if (mql && typeof mql.matches === 'boolean') {
    return mql.matches;
  }
  return window.innerHeight >= window.innerWidth;
}

function getIsMobileDevice() {
  if (typeof window === 'undefined') return false;
  const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || navigator.vendor || window.opera || ''
  );
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 1024;
  return isMobileUA || (isTouch && isSmallScreen);
}

/**
 * LandscapeOrientationPrompt
 *
 * Shows when viewing on mobile in portrait mode:
 * - Prompts user to rotate to landscape view.
 * - If the browser was closed/reopened or restored with the same active tab,
 *   and the device is in portrait mode, the dialog box will ALWAYS be shown.
 * - Automatically dismisses when the device is physically rotated to landscape.
 * - Provides "Rotate to view the site in landscape mode" with screen orientation lock
 *   and simulated CSS fallback.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);
  const [dismissed, setDismissed] = useState(false);
  const [forcedLandscape, setForcedLandscape] = useState(false);

  const checkOrientation = useCallback((isTabResume = false) => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // On non-mobile screens (desktop/laptop), ensure mobile zoom and forced rotation classes are NEVER applied
    if (!mobile) {
      document.documentElement.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      document.body.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      setForcedLandscape(false);
      return;
    }

    // If mobile device is in native landscape mode, ensure landscape and zoomed-out classes are active ONLY on authenticated app pages
    if (!portrait) {
      const isPublic =
        window.location.pathname === '/' ||
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (!isPublic) {
        document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
        document.body.classList.add('landscape-mode', 'app-zoomed-out');
      } else {
        document.documentElement.classList.remove('landscape-mode', 'app-zoomed-out');
        document.body.classList.remove('landscape-mode', 'app-zoomed-out');
      }
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
      setForcedLandscape(false);
      setDismissed(false);
      try {
        sessionStorage.removeItem('twogether_forced_landscape');
        sessionStorage.removeItem('twogether_landscape_dismissed');
      } catch (e) {}
    } else {
      // Device is in portrait mode
      if (isTabResume) {
        // When tab is reopened or browser is brought to foreground in portrait:
        // Always reset dismissed and forced landscape so the rotate dialog box appears!
        setDismissed(false);
        setForcedLandscape(false);
        document.documentElement.classList.remove('app-forced-landscape', 'landscape-mode');
        document.body.classList.remove('app-forced-landscape', 'landscape-mode');
        try {
          sessionStorage.removeItem('twogether_forced_landscape');
          sessionStorage.removeItem('twogether_landscape_dismissed');
        } catch (e) {}
      } else {
        // If device was turned back to portrait, ensure dismissed is reset so prompt reappears
        if (!forcedLandscape) {
          setDismissed(false);
        }
      }
    }
  }, [forcedLandscape]);

  useEffect(() => {
    // If desktop/laptop, remove any stale mobile classes
    if (!getIsMobileDevice()) {
      document.documentElement.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      document.body.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      setForcedLandscape(false);
      return;
    }

    // On mount on mobile, if device is in portrait, ensure clean state so prompt shows
    try {
      sessionStorage.removeItem('twogether_landscape_dismissed');
      if (getIsPortrait()) {
        sessionStorage.removeItem('twogether_forced_landscape');
        document.documentElement.classList.remove('app-forced-landscape', 'landscape-mode');
        document.body.classList.remove('app-forced-landscape', 'landscape-mode');
        setForcedLandscape(false);
        setDismissed(false);
      }
    } catch (e) {}

    // Proactively lock orientation to landscape on load if supported
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

    checkOrientation(true);

    const update = () => checkOrientation(false);
    const updateResume = () => checkOrientation(true);

    const portraitMql = window.matchMedia('(orientation: portrait)');
    if (portraitMql.addEventListener) {
      portraitMql.addEventListener('change', update);
    } else if (portraitMql.addListener) {
      portraitMql.addListener(update);
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener('change', update);
    }

    // Tab resume / browser reopen events:
    // When the browser is shut and reopened with active tab, visibilitychange/pageshow/focus fire!
    document.addEventListener('visibilitychange', updateResume);
    window.addEventListener('pageshow', updateResume);
    window.addEventListener('focus', updateResume);

    return () => {
      if (portraitMql.removeEventListener) {
        portraitMql.removeEventListener('change', update);
      } else if (portraitMql.removeListener) {
        portraitMql.removeListener(update);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (window.screen?.orientation?.removeEventListener) {
        window.screen.orientation.removeEventListener('change', update);
      }
      document.removeEventListener('visibilitychange', updateResume);
      window.removeEventListener('pageshow', updateResume);
      window.removeEventListener('focus', updateResume);
    };
  }, [checkOrientation]);

  // Action: Rotate to view the site in landscape mode
  const handleRotateLandscape = async () => {
    // 1. Dismiss modal so site opens up
    setDismissed(true);

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
    // Trigger resize events so spreadsheet recalculates 15-day view and centers today
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
  };

  const handleExitForcedLandscape = () => {
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');
    setForcedLandscape(false);
    setDismissed(false);
    try {
      sessionStorage.removeItem('twogether_forced_landscape');
      sessionStorage.removeItem('twogether_landscape_dismissed');
    } catch (e) {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
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
