import { useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DailyTasks from './pages/DailyTasks.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import VaultPage from './pages/VaultPage.jsx';
import Settings from './pages/Settings.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import MobileTopBar from './components/common/MobileTopBar.jsx';
import LeaderboardModal from './components/common/LeaderboardModal.jsx';
import PWAInstallModal from './components/common/PWAInstallModal.jsx';
import StreakShieldModal from './components/common/StreakShieldModal.jsx';
import NotificationPermissionBanner from './components/common/NotificationPermissionBanner.jsx';
import ImageNudgeModal from './components/common/ImageNudgeModal.jsx';
import NudgeViewerModal from './components/common/NudgeViewerModal.jsx';
import LandscapeOrientationPrompt from './components/common/LandscapeOrientationPrompt.jsx';
import { useSidebar } from './context/SidebarContext.jsx';
import { useAuth } from './context/AuthContext.jsx';

/**
 * NudgeWatcher — reads ?nudge=ID from the URL (set by the service worker
 * when a push notification is clicked) and opens the NudgeViewerModal.
 */
function NudgeWatcher() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openNudgeViewer } = useSidebar();
  const { user } = useAuth();

  useEffect(() => {
    const nudgeId = searchParams.get('nudge');
    if (nudgeId && user) {
      openNudgeViewer(nudgeId);
      // Strip the param from the URL so it doesn't persist on refresh
      const next = new URLSearchParams(searchParams);
      next.delete('nudge');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, user, openNudgeViewer, setSearchParams]);

  return null;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide sidebar and mobile topbar on public/landing/auth pages or when user is not logged in
  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';
  const showNavigation = !!user && !isPublicPage;

  return (
    <>
      {/* Global Navigation Sidebar & Mobile Bar (visible only after login on app pages) */}
      {showNavigation && (
        <>
          <Sidebar />
          <MobileTopBar />
        </>
      )}

      {/* Global Modals & Banners */}
      <LeaderboardModal />
      <PWAInstallModal />
      <StreakShieldModal />
      <ImageNudgeModal />
      <NudgeViewerModal />
      <NotificationPermissionBanner />
      <LandscapeOrientationPrompt />

      {/* Deep-link notification watcher */}
      <NudgeWatcher />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <DailyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard/:tab"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vault"
          element={
            <Navigate to="/settings?tab=vault" replace />
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}