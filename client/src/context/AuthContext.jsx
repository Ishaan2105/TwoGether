import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authService from '../services/auth.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'twogether_token';
const LEGACY_TOKEN_KEY = 'duohabit_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // initial bootstrap only

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: freshUser } = await authService.getMe();
      setUser(freshUser);
    } catch {
      logout();
    }
  }, [logout]);

  // Bootstrap: restore the session from the stored token
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
    const onUnauthorized = () => setUser(null);
    window.addEventListener('twogether:unauthorized', onUnauthorized);
    window.addEventListener('duohabit:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('twogether:unauthorized', onUnauthorized);
      window.removeEventListener('duohabit:unauthorized', onUnauthorized);
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user: loggedInUser } = await authService.login(identifier, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await authService.register(payload);
    localStorage.setItem(TOKEN_KEY, token);
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