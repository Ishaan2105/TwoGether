import { useState } from 'react';
import { useSidebar } from '../../context/SidebarContext.jsx';

export default function PWAInstallModal() {
  const { isPWAInstallOpen, closePWAInstall, isInstallable, isInstalled, triggerNativePWAInstall } =
    useSidebar();
  const [activePlatform, setActivePlatform] = useState(() => {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  });

  if (!isPWAInstallOpen) return null;

  return (
    <div className="modal-backdrop" onClick={closePWAInstall}>
      <div
        className="pwa-modal modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-title"
      >
        {/* Modal Header */}
        <div className="pwa-modal__header">
          <img src="/tg-logo.png" alt="TwoGether" className="pwa-modal__icon-img" />
          <div>
            <h2 id="pwa-title" className="pwa-modal__title">
              Install TwoGether App
            </h2>
            <p className="pwa-modal__subtitle">
              Install as a Progressive Web App for instant access, offline mode & native habit notifications.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closePWAInstall}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="pwa-modal__body">
          {/* Status Badge */}
          {isInstalled ? (
            <div className="pwa-status-banner pwa-status-banner--installed">
              <span className="pwa-status-icon">✓</span>
              <div>
                <strong>TwoGether is installed on your device!</strong>
                <p>You can launch it directly from your Home Screen or Applications list.</p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="pwa-status-banner pwa-status-banner--ready">
              <span className="pwa-status-icon">⚡</span>
              <div>
                <strong>1-Click Install Ready!</strong>
                <p>Your browser supports direct installation. Click below to add TwoGether to your device.</p>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={triggerNativePWAInstall}
              >
                Install Now
              </button>
            </div>
          ) : null}

          {/* Benefits Grid */}
          <div className="pwa-benefits-grid">
            <div className="pwa-benefit-card">
              <span className="pwa-benefit-icon">⚡</span>
              <div>
                <strong>Instant Launch</strong>
                <span>Runs fullscreen with 0 latency</span>
              </div>
            </div>
            <div className="pwa-benefit-card">
              <span className="pwa-benefit-icon">📴</span>
              <div>
                <strong>Offline Resilient</strong>
                <span>Check in even when offline</span>
              </div>
            </div>
            <div className="pwa-benefit-card">
              <span className="pwa-benefit-icon">🔔</span>
              <div>
                <strong>Partner Nudges</strong>
                <span>Never miss a duo milestone</span>
              </div>
            </div>
            <div className="pwa-benefit-card">
              <span className="pwa-benefit-icon">🔒</span>
              <div>
                <strong>Zero App Store</strong>
                <span>No 200MB app store downloads</span>
              </div>
            </div>
          </div>

          {/* Platform Guide Tabs */}
          <div className="pwa-guide-section">
            <span className="pwa-guide-title">INSTALLATION INSTRUCTIONS</span>
            <div className="pwa-tabs">
              <button
                type="button"
                className={`pwa-tab ${activePlatform === 'desktop' ? 'pwa-tab--active' : ''}`}
                onClick={() => setActivePlatform('desktop')}
              >
                🖥️ Desktop (Chrome / Edge)
              </button>
              <button
                type="button"
                className={`pwa-tab ${activePlatform === 'ios' ? 'pwa-tab--active' : ''}`}
                onClick={() => setActivePlatform('ios')}
              >
                🍎 iPhone / iPad (Safari)
              </button>
              <button
                type="button"
                className={`pwa-tab ${activePlatform === 'android' ? 'pwa-tab--active' : ''}`}
                onClick={() => setActivePlatform('android')}
              >
                🤖 Android (Chrome)
              </button>
            </div>

            <div className="pwa-guide-content">
              {activePlatform === 'desktop' && (
                <ol className="pwa-steps-list">
                  <li>
                    Look at the right side of your browser's <strong>Address Bar</strong> (URL bar).
                  </li>
                  <li>
                    Click the <strong>Install Icon</strong> (🖥️ or ⬇ Install TwoGether).
                  </li>
                  <li>
                    Click <strong>Install</strong> to add TwoGether as a native desktop application.
                  </li>
                </ol>
              )}

              {activePlatform === 'ios' && (
                <ol className="pwa-steps-list">
                  <li>
                    Open TwoGether in <strong>Safari</strong> on your iPhone or iPad.
                  </li>
                  <li>
                    Tap the <strong>Share</strong> button (square icon with an arrow pointing up 📤) in the bottom toolbar.
                  </li>
                  <li>
                    Scroll down the menu and tap <strong>"Add to Home Screen"</strong> (➕).
                  </li>
                  <li>
                    Tap <strong>"Add"</strong> in the top right corner.
                  </li>
                </ol>
              )}

              {activePlatform === 'android' && (
                <ol className="pwa-steps-list">
                  <li>
                    Open TwoGether in <strong>Chrome</strong> on your Android device.
                  </li>
                  <li>
                    Tap the <strong>three dots menu</strong> (⋮) in the top right corner.
                  </li>
                  <li>
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
                  </li>
                  <li>
                    Follow the on-screen prompt to confirm.
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pwa-modal__footer">
          {isInstallable && !isInstalled ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={triggerNativePWAInstall}
            >
              ⚡ Install TwoGether
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={closePWAInstall}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
