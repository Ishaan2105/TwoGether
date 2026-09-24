import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as duoService from '../services/duo.js';

const DuoContext = createContext(null);

export function DuoProvider({ children }) {
  const { user, refreshUser } = useAuth();
  const [duo, setDuo] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshDuo = useCallback(async () => {
    if (!user) {
      setDuo(null);
      setPartner(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await duoService.getMyDuo();
      setDuo(data?.duo || null);
      setPartner(data?.partner || null);
      return data;
    } catch (err) {
      console.error('Failed to load Duo:', err);
      setError(err.response?.data?.message || 'Failed to fetch Duo details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshDuo();
    } else {
      setDuo(null);
      setPartner(null);
    }
  }, [user, refreshDuo]);

  // Real-Time Sync: auto-poll while in Solo mode (waiting for partner to connect)
  useEffect(() => {
    if (!user || duo) return;

    // While user is unpaired, check every 5 seconds for partner pairing
    const pollInterval = setInterval(async () => {
      if (document.hidden) return; // Save bandwidth when tab is backgrounded
      try {
        const data = await duoService.getMyDuo();
        if (data?.duo) {
          setDuo(data.duo);
          setPartner(data.partner || null);
          if (refreshUser) refreshUser();
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [user, duo, refreshUser]);

  // Window Focus, Visibility & Service Worker message listeners for real-time Duo events
  useEffect(() => {
    if (!user) return;

    const handleSync = () => {
      if (!document.hidden) {
        refreshDuo();
        if (refreshUser) refreshUser();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Cross-tab sync via BroadcastChannel
    let channel = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('twogether_duo_sync');
        channel.onmessage = (event) => {
          if (event.data === 'duo-changed') {
            refreshDuo();
            if (refreshUser) refreshUser();
          }
        };
      }
    } catch (e) {}

    // Service Worker push notification listener
    const handleSwMessage = (event) => {
      const type = event.data?.payload?.data?.type || event.data?.type;
      if (type === 'duo-paired' || type === 'duo-unpaired' || event.data?.type === 'PUSH_RECEIVED') {
        refreshDuo();
        if (refreshUser) refreshUser();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      if (channel) channel.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [user, refreshDuo, refreshUser]);

  const lookup = useCallback(async (code) => {
    setError(null);
    return await duoService.lookupCode(code);
  }, []);

  const pair = useCallback(
    async (code) => {
      setError(null);
      const data = await duoService.pairWithCode(code);
      setDuo(data.duo);
      setPartner(data.partner);
      if (refreshUser) {
        await refreshUser();
      }
      try {
        if ('BroadcastChannel' in window) {
          const ch = new BroadcastChannel('twogether_duo_sync');
          ch.postMessage('duo-changed');
          ch.close();
        }
      } catch (e) {}
      return data;
    },
    [refreshUser]
  );

  const nudge = useCallback(async (type, message) => {
    const data = await duoService.sendNudge(type, message);
    if (data?.duo) {
      setDuo(data.duo);
    }
    return data;
  }, []);

  const unpair = useCallback(async () => {
    await duoService.unpairDuo();
    setDuo(null);
    setPartner(null);
    if (refreshUser) {
      await refreshUser();
    }
    try {
      if ('BroadcastChannel' in window) {
        const ch = new BroadcastChannel('twogether_duo_sync');
        ch.postMessage('duo-changed');
        ch.close();
      }
    } catch (e) {}
  }, [refreshUser]);

  return (
    <DuoContext.Provider
      value={{
        duo,
        partner,
        loading,
        error,
        lookup,
        pair,
        nudge,
        unpair,
        refreshDuo,
      }}
    >
      {children}
    </DuoContext.Provider>
  );
}

export function useDuo() {
  const ctx = useContext(DuoContext);
  if (!ctx) throw new Error('useDuo must be used within a DuoProvider');
  return ctx;
}
