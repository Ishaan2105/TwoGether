import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDuo } from '../../context/DuoContext.jsx';

export default function Sidebar() {
  const {
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openPWAInstall,
    isInstalled,
  } = useSidebar();
  const { user, logout } = useAuth();
  const { duo, partner } = useDuo();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close profile popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (isProfileOpen) setIsProfileOpen(false);
        else if (isSidebarOpen) closeSidebar();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen, isSidebarOpen, closeSidebar]);

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
    setIsProfileOpen(false);
  }, [location.pathname, closeSidebar]);

  const handleLogout = () => {
    setIsProfileOpen(false);
    closeSidebar();
    logout();
    navigate('/');
  };

  const initial = (user?.username?.[0] || 'U').toUpperCase();

  if (!user || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* ── Fixed Accessible Edge Toggle Trigger (Visible in Landscape Mobile / PWA View) ── */}
      <button
        type="button"
        className={`sidebar-edge-toggle ${isSidebarOpen ? 'sidebar-edge-toggle--hidden' : ''}`}
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isSidebarOpen}
        aria-controls="main-sidebar-drawer"
        id="sidebar-edge-toggle-btn"
        title="Open navigation menu"
      >
        <span className="sidebar-edge-toggle__bar sidebar-edge-toggle__bar--1" />
        <span className="sidebar-edge-toggle__bar sidebar-edge-toggle__bar--2" />
        <span className="sidebar-edge-toggle__bar sidebar-edge-toggle__bar--3" />
      </button>

      {/* Dimmed backdrop overlay with dynamic blur effect */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar-drawer"
        className={`sidebar-drawer ${isSidebarOpen ? 'sidebar-drawer--open' : ''}`}
        role="navigation"
        aria-label="Main application sidebar"
      >
        {/* ── 1. Brand Header ── */}
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-brand" onClick={closeSidebar}>
            <img src="/tg-logo.png" alt="TwoGether Logo" className="sidebar-brand-img" />
            <span className="sidebar-brand-name">TwoGether</span>
          </NavLink>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close sidebar"
            id="sidebar-drawer-close-btn"
          >
            ✕
          </button>
        </div>

        {/* ── 2. Scrollable Navigation Content ── */}
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            {/* Main Daily Sections */}
            <div className="sidebar-section">
              <NavLink
                to="/tasks"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">My Tasks</span>
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Duo Section</span>
              </NavLink>
            </div>

            <div className="sidebar-nav-divider" />

            {/* Leaderboard Rankings */}
            <div className="sidebar-section">
              <NavLink
                to="/leaderboard/solo"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive || location.pathname === '/leaderboard' ? 'sidebar-nav-item--active' : ''}`
                }
                onClick={closeSidebar}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Solo Leaderboard</span>
              </NavLink>

              <NavLink
                to="/leaderboard/duo"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Duo Leaderboard</span>
              </NavLink>
            </div>

            <div className="sidebar-nav-divider" />

            {/* Settings & App */}
            <div className="sidebar-section">
              {/* ── ⚙️ SETTINGS PAGE LINK ── */}
              <NavLink
                to="/settings"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                id="settings-nav-btn"
                onClick={closeSidebar}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Settings</span>
              </NavLink>

              {/* Install PWA — hidden once installed */}
              {!isInstalled && (
                <button
                  type="button"
                  className="sidebar-nav-item"
                  onClick={() => {
                    closeSidebar();
                    openPWAInstall();
                  }}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </span>
                  <span className="sidebar-nav-label">PWA App</span>
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* ── 3. Bottom User Profile ── */}
        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-profile-wrapper" ref={profileMenuRef}>
              {/* Upward Popover */}
              {isProfileOpen && (
                <div
                  className="sidebar-profile-popover"
                  role="menu"
                  aria-label="User profile options"
                >
                  {/* Minimal Profile Header */}
                  <div className="sidebar-popover__header">
                    <div className="sidebar-popover__avatar-large" aria-hidden="true">
                      <span>{initial}</span>
                    </div>
                    <div className="sidebar-popover__user-info">
                      <span className="sidebar-popover__username" title={user.username}>{user.username}</span>
                      {user.email && (
                        <span className="sidebar-popover__email" title={user.email}>{user.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="sidebar-popover__divider" />

                  {/* Log Out */}
                  <div className="sidebar-popover__footer">
                    <button type="button" className="sidebar-popover__logout-btn" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Profile Trigger */}
              <button
                type="button"
                className={`sidebar-profile-trigger ${isProfileOpen ? 'sidebar-profile-trigger--open' : ''}`}
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                aria-label={`User menu for ${user.username}`}
              >
                <div className="sidebar-profile-avatar" aria-hidden="true">
                  <span>{initial}</span>
                  <span className="sidebar-profile-status-dot" />
                </div>
                <div className="sidebar-profile-info">
                  <span className="sidebar-profile-name" title={user.username}>{user.username}</span>
                  <span className="sidebar-profile-sub">
                    ⚡ Lv {user.personalLevel || 1} • {user.customTitle || 'Adventurer'}
                  </span>
                </div>
                <span className={`sidebar-profile-chevron ${isProfileOpen ? 'sidebar-profile-chevron--open' : ''}`} aria-hidden="true">▴</span>
              </button>
            </div>
          ) : (
            <div className="sidebar-guest-footer">
              <div className="sidebar-guest-buttons">
                <NavLink to="/login" className="btn btn--ghost btn--sm btn--block" onClick={() => window.innerWidth < 900 && closeSidebar()}>Log in</NavLink>
                <NavLink to="/register" className="btn btn--primary btn--sm btn--block" onClick={() => window.innerWidth < 900 && closeSidebar()}>Start your Duo</NavLink>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
