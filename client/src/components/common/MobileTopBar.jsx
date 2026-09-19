import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * MobileTopBar
 *
 * Dedicated portrait header displaying:
 * - Left: Navigation drawer toggle hamburger
 * - Center: TwoGether text & logo
 * - Right: Account name & avatar with dropdown containing details and Logout button
 */
export default function MobileTopBar() {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  if (!user || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/');
  };

  const initial = (user?.username?.[0] || 'U').toUpperCase();

  return (
    <header className="mobile-topbar portrait-topbar" aria-label="Mobile navigation header">
      {/* 1. Left: Hamburger sidebar toggle */}
      <div className="mobile-topbar__left portrait-topbar__left">
        <button
          type="button"
          className="mobile-topbar__toggle"
          onClick={toggleSidebar}
          aria-label="Open navigation sidebar menu"
          id="mobile-sidebar-toggle-btn"
        >
          <span className="mobile-topbar__hamburger-line" />
          <span className="mobile-topbar__hamburger-line" />
          <span className="mobile-topbar__hamburger-line" />
        </button>
      </div>

      {/* 2. Center: Logo + TwoGether */}
      <Link to="/dashboard" className="mobile-topbar__brand portrait-topbar__center" title="Go to Dashboard">
        <img src="/tg-logo.png" alt="TwoGether Logo" className="mobile-topbar__logo-img portrait-topbar__logo" />
        <span className="mobile-topbar__title portrait-topbar__brand">TwoGether</span>
      </Link>

      {/* 3. Right: Account Name & Logout Dropdown */}
      <div className="mobile-topbar__right portrait-topbar__right" ref={menuRef}>
        <button
          type="button"
          className={`portrait-topbar__account-btn ${isMenuOpen ? 'portrait-topbar__account-btn--open' : ''}`}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label={`Account menu for ${user.username}`}
          id="portrait-account-menu-btn"
        >
          <span className="portrait-topbar__avatar-badge">{initial}</span>
          <span className="portrait-topbar__account-name" title={user.username}>
            {user.username}
          </span>
          <svg
            className={`portrait-topbar__chevron ${isMenuOpen ? 'portrait-topbar__chevron--open' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Account Dropdown Modal / Popover */}
        {isMenuOpen && (
          <div className="portrait-topbar__dropdown" role="menu" aria-label="User Account Options">
            <div className="portrait-topbar__dropdown-user">
              <div className="portrait-topbar__dropdown-avatar">{initial}</div>
              <div className="portrait-topbar__dropdown-details">
                <span className="portrait-topbar__dropdown-name">{user.username}</span>
                {user.email && (
                  <span className="portrait-topbar__dropdown-email">{user.email}</span>
                )}
              </div>
            </div>

            <div className="portrait-topbar__dropdown-divider" />

            <button
              type="button"
              className="portrait-topbar__logout-btn"
              onClick={handleLogout}
              role="menuitem"
              id="portrait-logout-btn"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
