import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authService from '../services/auth.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'twogether_token';
const LEGACY_TOKEN_KEY = 'duohabit_token';
const USER_KEY = 'twogether_user';

export function AuthProvider({ children }) {
  // Synchronous user hydration from localStorage so the user is immediately logged in
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (token && savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to parse cached user:', e);
    }
    return null;
  });

  // Initial loading is false if we already restored a cached session
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    return !(token && savedUser);
  });

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: freshUser } = await authService.getMe();
      setUser(freshUser);
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    } catch (err) {
      // CRITICAL: Only log out if the server explicitly tells us the token is invalid/expired (HTTP 401).
      // If there is a network error, offline mode, or Render server cold-start (502/503/timeout),
      // DO NOT logout! Preserve the user session so they stay logged in seamlessly.
      if (err?.response?.status === 401) {
        console.warn('[AuthContext] 401 Unauthorized received, logging out.');
        logout();
      } else {
        console.warn('[AuthContext] Network/server issue during refresh, keeping offline session active:', err?.message || err);
      }
    }
  }, [logout]);

  // Bootstrap: restore and verify session from stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    if (!localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // React to global 401s (expired token mid-session)
  useEffect(() => {
    const onUnauthorized = () => {
      logout();
    };
    window.addEventListener('twogether:unauthorized', onUnauthorized);
    window.addEventListener('duohabit:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('twogether:unauthorized', onUnauthorized);
      window.removeEventListener('duohabit:unauthorized', onUnauthorized);
    };
  }, [logout]);

  const login = useCallback(async (identifier, password) => {
    const { token, user: loggedInUser } = await authService.login(identifier, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await authService.register(payload);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}