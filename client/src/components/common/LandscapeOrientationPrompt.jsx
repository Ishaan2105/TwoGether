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
 * Handles mobile orientation naturally:
 * - In portrait: renders upright, clean, and responsive without any sideways rotation.
 * - In landscape: enables widescreen landscape mode and zoom optimization.
 * - In installed PWA mode: requests native landscape orientation if supported.
 * - Laptop/desktop: normal responsive widescreen.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);

  const syncOrientation = useCallback(() => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // Clean up any stale forced landscape classes
    document.documentElement.classList.remove('app-forced-landscape');
    document.body.classList.remove('app-forced-landscape');

    // On laptop/desktop, ensure mobile zoom classes are never applied
    if (!mobile) {
      document.documentElement.classList.remove('app-zoomed-out', 'landscape-mode');
      document.body.classList.remove('app-zoomed-out', 'landscape-mode');
      return;
    }

    // Try native screen orientation lock for installed PWA standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone && window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

    if (!portrait) {
      // Device is physically in landscape mode: enable widescreen optimizations
      document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
      document.body.classList.add('landscape-mode', 'app-zoomed-out');
    } else {
      // Device is in portrait mode: render upright and normal
      document.documentElement.classList.remove('landscape-mode', 'app-zoomed-out');
      document.body.classList.remove('landscape-mode', 'app-zoomed-out');
    }

    // Trigger resize so grid and spreadsheet recompute smoothly
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  }, []);

  useEffect(() => {
    syncOrientation();

    const update = () => syncOrientation();

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
  }, [syncOrientation]);

  return null;
}
