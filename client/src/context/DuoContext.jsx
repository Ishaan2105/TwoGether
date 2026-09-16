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

  useEffect(() => {
    if (user) {
      refreshDuo();
    } else {
      setDuo(null);
      setPartner(null);
    }
  }, [user, refreshDuo]);

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
