import { NavLink, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * PortraitBottomBar
 *
 * Bottom tab bar for portrait mode mobile users.
 * Displays tabs in the exact sequence:
 * 1. My Tasks
 * 2. Duo Section
 * 3. Solo Leaderboard
 * 4. Duo Leaderboard
 * 5. Settings
 * 6. PWA App (visible in browser when not downloaded, hidden when running as PWA)
 */
export default function PortraitBottomBar() {
  const { openPWAInstall, isInstalled } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  // Only show for logged in users on app pages
  const isPublicPage =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (!user || isPublicPage) {
    return null;
  }

  // Check if running as standalone PWA
  const isStandalone =
    isInstalled ||
    (typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true));

  return (
    <nav className="portrait-bottom-bar" aria-label="Bottom tab navigation">
      {/* 1. My Tasks */}
      <NavLink
        to="/tasks"
        className={({ isActive }) =>
          `portrait-tab-item ${isActive ? 'portrait-tab-item--active' : ''}`
        }
        title="My Tasks"
      >
        <span className="portrait-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <span className="portrait-tab-label">My Tasks</span>
      </NavLink>

      {/* 2. Duo Section */}
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `portrait-tab-item ${isActive ? 'portrait-tab-item--active' : ''}`
        }
        title="Duo Section"
      >
        <span className="portrait-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span className="portrait-tab-label">Duo Section</span>
      </NavLink>

      {/* 3. Solo Leaderboard */}
      <NavLink
        to="/leaderboard/solo"
        className={({ isActive }) =>
          `portrait-tab-item ${
            isActive || location.pathname === '/leaderboard' ? 'portrait-tab-item--active' : ''
          }`
        }
        title="Solo Leaderboard"
      >
        <span className="portrait-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
        </span>
        <span className="portrait-tab-label">Solo Leaderboard</span>
      </NavLink>

      {/* 4. Duo Leaderboard */}
      <NavLink
        to="/leaderboard/duo"
        className={({ isActive }) =>
          `portrait-tab-item ${isActive ? 'portrait-tab-item--active' : ''}`
        }
        title="Duo Leaderboard"
      >
        <span className="portrait-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </span>
        <span className="portrait-tab-label">Duo Leaderboard</span>
      </NavLink>

      {/* 5. Settings */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `portrait-tab-item ${isActive ? 'portrait-tab-item--active' : ''}`
        }
        title="Settings"
      >
        <span className="portrait-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </span>
        <span className="portrait-tab-label">Settings</span>
      </NavLink>

      {/* 6. PWA App (Only shown when not installed/standalone) */}
      {!isStandalone && (
        <button
          type="button"
          className="portrait-tab-item portrait-tab-item--pwa"
          onClick={openPWAInstall}
          title="Install PWA App"
        >
          <span className="portrait-tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </span>
          <span className="portrait-tab-label">PWA App</span>
        </button>
      )}
    </nav>
  );
}
