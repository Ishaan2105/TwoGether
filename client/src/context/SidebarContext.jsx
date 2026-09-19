import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('solo'); // 'solo' | 'duo'
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);
  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  const [isImageNudgeOpen, setIsImageNudgeOpen] = useState(false);
  const [isNudgeViewerOpen, setIsNudgeViewerOpen] = useState(false);
  const [activeNudgeId, setActiveNudgeId] = useState(null);
  const [activeNudgeDuration, setActiveNudgeDuration] = useState(null);

  // PWA beforeinstallprompt management
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  const openLeaderboard = useCallback((tab = 'duo') => {
    setLeaderboardTab(tab);
    setIsLeaderboardOpen(true);
    setIsSidebarOpen(false);
  }, []);

  const closeLeaderboard = useCallback(() => setIsLeaderboardOpen(false), []);

  const openPWAInstall = useCallback(() => setIsPWAInstallOpen(true), []);
  const closePWAInstall = useCallback(() => setIsPWAInstallOpen(false), []);

  const openShieldModal = useCallback(() => {
    setIsShieldModalOpen(true);
    setIsSidebarOpen(false);
  }, []);

  const closeShieldModal = useCallback(() => setIsShieldModalOpen(false), []);

  const openImageNudge = useCallback(() => {
    setIsImageNudgeOpen(true);
    setIsSidebarOpen(false);
  }, []);

  const closeImageNudge = useCallback(() => setIsImageNudgeOpen(false), []);

  const openNudgeViewer = useCallback((nudgeId, initialDuration = null) => {
    setActiveNudgeId(nudgeId);
    if (initialDuration) {
      setActiveNudgeDuration(initialDuration);
    }
    setIsNudgeViewerOpen(true);
  }, []);

  const closeNudgeViewer = useCallback(() => {
    setIsNudgeViewerOpen(false);
    setActiveNudgeId(null);
    setActiveNudgeDuration(null);
  }, []);

  const triggerNativePWAInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // If native prompt not available, open the guided modal
      setIsPWAInstallOpen(true);
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsPWAInstallOpen(false);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        isLeaderboardOpen,
        leaderboardTab,
        setLeaderboardTab,
        openLeaderboard,
        closeLeaderboard,
        isPWAInstallOpen,
        openPWAInstall,
        closePWAInstall,
        isShieldModalOpen,
        openShieldModal,
        closeShieldModal,
        isImageNudgeOpen,
        openImageNudge,
        closeImageNudge,
        isNudgeViewerOpen,
        activeNudgeId,
        activeNudgeDuration,
        openNudgeViewer,
        closeNudgeViewer,
        isInstallable: !!deferredPrompt,
        isInstalled,
        triggerNativePWAInstall,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
