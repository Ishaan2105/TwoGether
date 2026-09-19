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
import NudgeActionModal from './components/common/NudgeActionModal.jsx';
import IncomingAlertModal from './components/common/IncomingAlertModal.jsx';
import LandscapeOrientationPrompt from './components/common/LandscapeOrientationPrompt.jsx';
import InAppConfirmModal from './components/common/InAppConfirmModal.jsx';
import { useSidebar } from './context/SidebarContext.jsx';
import { useAuth } from './context/AuthContext.jsx';

/**
 * NudgeWatcher — reads ?nudge=ID and ?action=hype|nudge|sos from the URL
 * and listens to background service worker alert messages.
 */
function NudgeWatcher() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openNudgeViewer, openIncomingAlert } = useSidebar();
  const { user } = useAuth();

  useEffect(() => {
    const nudgeId = searchParams.get('nudge');
    const urlDuration = searchParams.get('d') || searchParams.get('duration');
    const action = searchParams.get('action');
    const fromUsername = searchParams.get('from');

    if (nudgeId && user) {
      const parsedDur = urlDuration ? parseInt(urlDuration, 10) : null;
      openNudgeViewer(nudgeId, parsedDur && !isNaN(parsedDur) ? parsedDur : null);
      const next = new URLSearchParams(searchParams);
      next.delete('nudge');
      next.delete('d');
      next.delete('duration');
      setSearchParams(next, { replace: true });
    } else if (action && user) {
      openIncomingAlert({
        type: action,
        fromUsername: fromUsername || 'Partner',
      });
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      next.delete('from');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, user, openNudgeViewer, openIncomingAlert, setSearchParams]);

  // Handle push notification click when PWA window is already active/open
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !user) return;
    const handleSwMessage = (event) => {
      if (event.data?.type === 'OPEN_IMAGE_NUDGE' && event.data?.nudgeId) {
        const dur = event.data.duration ? parseInt(event.data.duration, 10) : null;
        openNudgeViewer(event.data.nudgeId, dur && !isNaN(dur) ? dur : null);
      } else if (event.data?.type === 'INCOMING_DUO_ALERT' && event.data?.notifType) {
        if (event.data.notifType === 'image-nudge' && event.data.nudgeId) {
          const dur = event.data.duration ? parseInt(event.data.duration, 10) : null;
          openNudgeViewer(event.data.nudgeId, dur && !isNaN(dur) ? dur : null);
        } else {
          openIncomingAlert({
            type: event.data.notifType,
            fromUsername: event.data.fromUsername || 'Partner',
            message: event.data.message || '',
          });
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [user, openNudgeViewer, openIncomingAlert]);

  return null;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide sidebar and mobile topbar on public/landing/auth pages or when user is not logged in
  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';
  const showNavigation = !!user && !isPublicPage;

  // Dynamically switch viewport between Desktop Site View (Landing & Login) and Responsive View (App)
  useEffect(() => {
    let vp = document.getElementById('app-viewport') || document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      vp.id = 'app-viewport';
      document.head.appendChild(vp);
    }

    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=3.0, viewport-fit=cover');

    // Landing, Login, and Register pages color theme is always Dark Blue (#0a192f / #050f1d)
    if (isPublicPage) {
      document.documentElement.classList.add('landing-dark-theme');
      document.body.classList.add('landing-dark-theme');
    } else {
      document.documentElement.classList.remove('landing-dark-theme');
      document.body.classList.remove('landing-dark-theme');
    }

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    if (isAuthPage) {
      document.documentElement.classList.add('auth-page-active');
      document.body.classList.add('auth-page-active');
    } else {
      document.documentElement.classList.remove('auth-page-active');
      document.body.classList.remove('auth-page-active');
    }
  }, [isPublicPage, location.pathname]);

  return (
    <>
      {/* Global Navigation Sidebar (visible only after login on app pages) */}
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
      <NudgeActionModal />
      <IncomingAlertModal />
      <NotificationPermissionBanner />
      <LandscapeOrientationPrompt />
      <InAppConfirmModal />

      {/* Deep-link notification watcher */}
      <NudgeWatcher />

      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
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