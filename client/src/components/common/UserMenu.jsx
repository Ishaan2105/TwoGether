import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function UserMenu({ user, onLogout }) {
  const { theme, setTheme, THEMES } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Get first letter of username for the initial badge
  const initial = (user?.username?.trim()?.[0] || 'U').toUpperCase();

  const currentThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (themeId) => {
    setTheme(themeId);
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="user-menu" ref={menuRef}>
      {/* Topbar Initial Trigger Button */}
      <button
        type="button"
        className={`user-menu__trigger ${isOpen ? 'user-menu__trigger--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${user.username || 'user'}. Click to view profile and settings.`}
        title={`${user.username || 'User'} (Lv ${user.personalLevel || 1}) — Click for profile & settings`}
      >
        <span className="user-menu__trigger-initial" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu__status-dot" aria-hidden="true" />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          className="user-menu__dropdown"
          role="menu"
          aria-label="User profile and settings"
        >
          {/* 1. Profile Header */}
          <div className="user-menu__header">
            <div className="user-menu__avatar-large" aria-hidden="true">
              <span>{initial}</span>
            </div>
            <div className="user-menu__user-info">
              <div className="user-menu__name-row">
                <span className="user-menu__username" title={user.username}>
                  {user.username}
                </span>
              </div>
              {user.email && (
                <span className="user-menu__email" title={user.email}>
                  {user.email}
                </span>
              )}
              <div className="user-menu__meta-badges">
                <span className="user-menu__level-badge">
                  <span className="user-menu__level-icon" aria-hidden="true">⚡</span>
                  <span>Level {user.personalLevel || 1}</span>
                </span>
                {user.customTitle && (
                  <span className="user-menu__title-badge" title={user.customTitle}>
                    {user.customTitle}
                  </span>
                )}
                {typeof user.personalXP === 'number' && user.personalXP > 0 && (
                  <span className="user-menu__xp-badge">
                    {user.personalXP} XP
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="user-menu__divider" />

          {/* 2. Theme Switching Options */}
          <div className="user-menu__section">
            <div className="user-menu__section-header">
              <span className="user-menu__section-title">
                <svg
                  className="user-menu__section-icon-svg"
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 0 0 20v-20z" />
                </svg>
                THEME & APPEARANCE
              </span>
              <span className="user-menu__theme-current-label">
                {currentThemeObj.name}
              </span>
            </div>

            <div className="user-menu__theme-grid" role="group" aria-label="Theme options">
              {THEMES.map((t) => {
                const isSelected = t.id === theme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    className={`user-menu__theme-card ${isSelected ? 'user-menu__theme-card--active' : ''}`}
                    onClick={() => handleSelectTheme(t.id)}
                    title={t.desc}
                  >
                    <div
                      className="user-menu__theme-swatch"
                      style={{
                        backgroundColor: t.previewColor,
                        borderColor: t.accentColor,
                      }}
                    >
                      <span
                        className="user-menu__theme-swatch-dot"
                        style={{ backgroundColor: t.accentColor }}
                      />
                    </div>
                    <div className="user-menu__theme-card-info">
                      <span className="user-menu__theme-card-name">{t.name}</span>
                      {t.id === 'dark' && (
                        <span className="user-menu__theme-tag">DEF</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="user-menu__theme-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="user-menu__divider" />

          {/* 3. Navigation Shortcuts */}
          <div className="user-menu__nav-section">
            <Link
              to="/dashboard"
              className="user-menu__nav-item"
              onClick={() => setIsOpen(false)}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              to="/tasks"
              className="user-menu__nav-item"
              onClick={() => setIsOpen(false)}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Daily Tasks</span>
            </Link>
          </div>

          <div className="user-menu__divider" />

          {/* 4. Logout Action */}
          <div className="user-menu__footer">
            <button
              type="button"
              className="user-menu__logout-btn"
              onClick={handleLogoutClick}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
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
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
