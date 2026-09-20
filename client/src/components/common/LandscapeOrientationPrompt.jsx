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
 * Automatically opens the app in horizontal (landscape) view on mobile devices:
 * - Directly activates horizontal view when held in portrait without displaying an intrusive dialog box.
 * - If physically rotated to landscape, smoothly transitions to native horizontal mode.
 * - Attempts native screen orientation lock to landscape if supported.
 * - Removes mobile rotation/zoom styles on laptop/desktop.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);
  const [manualExit, setManualExit] = useState(false);

  const applyHorizontalView = useCallback(() => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // On laptop/desktop, ensure mobile rotation/zoom classes are never applied
    if (!mobile) {
      document.documentElement.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      document.body.classList.remove('app-zoomed-out', 'app-forced-landscape', 'landscape-mode');
      return;
    }

    // Try native screen orientation lock
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

    if (!portrait) {
      // Device is physically in landscape mode
      document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
      document.body.classList.add('landscape-mode', 'app-zoomed-out');
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
    } else {
      // Device is in portrait mode on mobile: directly open in horizontal view
      if (!manualExit) {
        document.documentElement.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
        document.body.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
      } else {
        document.documentElement.classList.remove('app-forced-landscape');
        document.body.classList.remove('app-forced-landscape');
      }
    }

    // Trigger resize events so spreadsheet and layout fit horizontal bounds
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
  }, [manualExit]);

  useEffect(() => {
    applyHorizontalView();

    const update = () => {
      setManualExit(false);
      applyHorizontalView();
    };

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

    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('focus', update);

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
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('focus', update);
    };
  }, [applyHorizontalView]);

  const handleToggleForcedLandscape = () => {
    if (manualExit) {
      setManualExit(false);
      document.documentElement.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
      document.body.classList.add('app-forced-landscape', 'landscape-mode', 'app-zoomed-out');
    } else {
      setManualExit(true);
      document.documentElement.classList.remove('app-forced-landscape');
      document.body.classList.remove('app-forced-landscape');
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  // Only show the small toggle FAB when in portrait on mobile
  if (!isMobileDevice || !isPortrait) return null;

  return (
    <button
      type="button"
      className="orientation-toggle-fab"
      onClick={handleToggleForcedLandscape}
      title={manualExit ? 'Switch to Horizontal View' : 'Switch to Portrait View'}
      id="btn-toggle-orientation"
    >
      <span className="orientation-toggle-fab__icon">🔄</span>
      <span>{manualExit ? 'Horizontal View' : 'Portrait View'}</span>
    </button>
  );
}
