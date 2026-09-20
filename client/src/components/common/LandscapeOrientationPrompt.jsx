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
 * Provides strict horizontal landscape orientation:
 * - When in portrait on mobile, provides a 1-tap switch to Fullscreen Landscape.
 * - In installed PWA mode, automatically locks to landscape.
 * - In landscape mode, activates full widescreen layout.
 */
export default function LandscapeOrientationPrompt() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);
  const [isMobileDevice, setIsMobileDevice] = useState(getIsMobileDevice);

  const syncOrientation = useCallback(() => {
    const portrait = getIsPortrait();
    const mobile = getIsMobileDevice();

    setIsPortrait(portrait);
    setIsMobileDevice(mobile);

    // On laptop/desktop, ensure mobile zoom classes are never applied
    if (!mobile) {
      document.documentElement.classList.remove('app-zoomed-out', 'landscape-mode');
      document.body.classList.remove('app-zoomed-out', 'landscape-mode');
      return;
    }

    // In installed PWA standalone mode, lock to landscape automatically
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone && window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

    if (!portrait) {
      // Device is in landscape: enable widescreen layout
      document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
      document.body.classList.add('landscape-mode', 'app-zoomed-out');
    } else {
      document.documentElement.classList.remove('landscape-mode', 'app-zoomed-out');
      document.body.classList.remove('landscape-mode', 'app-zoomed-out');
    }

    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  }, []);

  const enterStrictLandscape = async () => {
    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFS) {
      try {
        await requestFS.call(docEl).catch(() => {});
      } catch (e) {}
    }

    try {
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock('landscape').catch(() => {});
      } else if (window.screen?.lockOrientation) {
        window.screen.lockOrientation('landscape');
      }
    } catch (err) {}

    document.documentElement.classList.add('landscape-mode', 'app-zoomed-out');
    document.body.classList.add('landscape-mode', 'app-zoomed-out');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  };

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

  // Only show the 1-tap horizontal button when holding phone in portrait in a browser
  if (!isMobileDevice || !isPortrait) return null;

  return (
    <div className="strict-landscape-banner">
      <button
        type="button"
        className="strict-landscape-btn"
        onClick={enterStrictLandscape}
        id="btn-enter-strict-landscape"
      >
        <span className="strict-landscape-btn__icon">🔄</span>
        <span className="strict-landscape-btn__text">Switch to Horizontal / Landscape Mode</span>
      </button>
    </div>
  );
}
