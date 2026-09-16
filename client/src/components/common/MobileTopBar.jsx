import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MobileTopBar() {
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const initial = (user?.username?.[0] || 'U').toUpperCase();

  return (
    <header className="mobile-topbar" aria-label="Mobile navigation header">
      <div className="mobile-topbar__left">
        <button
          type="button"
          className="mobile-topbar__toggle"
          onClick={toggleSidebar}
          aria-label="Open navigation sidebar menu"
        >
          <span className="mobile-topbar__hamburger-line" />
          <span className="mobile-topbar__hamburger-line" />
          <span className="mobile-topbar__hamburger-line" />
        </button>

        <Link to="/" className="mobile-topbar__brand">
          <img src="/tg-logo.png" alt="TwoGether Logo" className="mobile-topbar__logo-img" />
          <span className="mobile-topbar__title">TwoGether</span>
        </Link>
      </div>

      {user && (
        <button
          type="button"
          className="mobile-topbar__avatar"
          onClick={toggleSidebar}
          aria-label={`Open menu for ${user.username}`}
        >
          <span>{initial}</span>
        </button>
      )}
    </header>
  );
}
