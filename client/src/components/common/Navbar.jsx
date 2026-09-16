import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import UserMenu from './UserMenu.jsx';
import Sidebar from './Sidebar.jsx';
import LeaderboardModal from './LeaderboardModal.jsx';
import PWAInstallModal from './PWAInstallModal.jsx';
import StreakShieldModal from './StreakShieldModal.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar__left">
          <button
            type="button"
            className="navbar__sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Open navigation sidebar"
            title="Open Menu (Daily Tasks, Duo, Leaderboards, PWA)"
          >
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
          </button>

          <Link to="/" className="navbar__brand">
            <img src="/tg-logo.png" alt="TwoGether Logo" className="navbar__logo-img" />
            <span>TwoGether</span>
          </Link>
        </div>

        <nav className="navbar__links" aria-label="Main navigation">
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <ThemeSwitcher />
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Start your Duo
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Global Sidebar & Modals */}
      <Sidebar />
      <LeaderboardModal />
      <PWAInstallModal />
      <StreakShieldModal />
    </>
  );
}