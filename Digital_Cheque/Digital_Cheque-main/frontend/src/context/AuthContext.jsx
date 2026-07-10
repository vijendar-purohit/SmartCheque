/**
 * AuthContext — single source of truth for the logged-in user.
 *
 * - JWT lives in module memory (api/client.js), not localStorage.
 * - On mount we try /auth/me to rehydrate a previous session. If that
 *   returns 401 (token expired/missing) we stay logged-out.
 * - Listens for the smartcheque:auth:logout event from the axios
 *   interceptor and clears state.
 * - login() / register() / logout() call the backend, store the token,
 *   and set the user. Components consume `useAuth()`.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as authApi from '../api/auth';
import { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);     // null = not logged in
  const [account, setAccount] = useState(null); // {account_number, ifsc, balance}
  const [bootstrapping, setBootstrapping] = useState(true); // initial /auth/me check
  const tokenRef = useRef(null);

  const applyAuthResponse = useCallback((resp) => {
    if (!resp || !resp.access_token) return;
    tokenRef.current = resp.access_token;
    setAuthToken(resp.access_token);
    setUser(resp.user || null);
    setAccount(resp.account || null);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    setAuthToken(null);
    setUser(null);
    setAccount(null);
  }, []);

  // Initial bootstrap: try /auth/me with whatever token is in module memory.
  // On a fresh page load tokenRef is null, so we stay logged-out quickly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // We have no token on a hard reload (intentional — JWT in memory).
        // This call will 401 quickly and we ignore the error.
        const resp = await authApi.me();
        if (cancelled) return;
        // No token was sent, but if the backend somehow returns data,
        // accept it (defensive).
        applyAuthResponse(resp);
      } catch (_) {
        /* expected — not logged in */
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applyAuthResponse]);

  // Axios interceptor dispatches this on 401 → force-logout.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('smartcheque:auth:logout', handler);
    return () => window.removeEventListener('smartcheque:auth:logout', handler);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const resp = await authApi.login({ email, password });
    applyAuthResponse(resp);
    return resp;
  }, [applyAuthResponse]);

  const register = useCallback(async (payload) => {
    // payload: {full_name, email, password, mobile, role}
    const resp = await authApi.register(payload);
    applyAuthResponse(resp);
    return resp;
  }, [applyAuthResponse]);

  const refreshMe = useCallback(async () => {
    try {
      const resp = await authApi.me();
      applyAuthResponse(resp);
      return resp;
    } catch (e) {
      logout();
      throw e;
    }
  }, [applyAuthResponse, logout]);

  const refreshBalance = useCallback(async () => {
    try {
      const resp = await authApi.me();
      // `me()` already returns the unwrapped AuthResponse (axios client.data).
      // The backend's payload shape is {access_token, user, account} — same as
      // login/register, so route it through applyAuthResponse to update both
      // user and account atomically.
      applyAuthResponse(resp);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [applyAuthResponse]);

  const value = useMemo(() => ({
    user, account, bootstrapping,
    isAuthenticated: !!user,
    login, register, logout, refreshMe, refreshBalance,
  }), [user, account, bootstrapping, login, register, logout, refreshMe, refreshBalance]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}