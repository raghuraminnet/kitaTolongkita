import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getAccessToken, setAccessToken, clearTokens } from '../api/client';
import * as DemoMode from '../api/demoMode';
import { registerForPushNotifications } from '../api/notifications';
import type { User } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isDemo: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Boot: init demo data + restore session
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      // Init demo data if demo mode
      if (DemoMode.isDemoMode()) {
        await DemoMode.initDemoData();
        const demoLoggedIn = await DemoMode.isDemoLoggedIn();
        if (demoLoggedIn) {
          const demoUser = await DemoMode.getDemoLoggedInUser();
          if (demoUser) {
            setUser(demoUser);
            setToken('demo-token');
            setIsDemo(true);
            setLoading(false);
            return;
          }
        }
      }

      // Normal token restore
      const stored = await getAccessToken();
      if (!stored) { setLoading(false); return; }
      setToken(stored);
      const me = await authApi.getMe();
      setUser(me);

      // Register device for push notifications in the background
      registerForPushNotifications().catch(() => {});
    } catch {
      await clearTokens();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = useCallback(async (newToken: string) => {
    if (DemoMode.isDemoMode() && newToken.startsWith('demo-token')) {
      setToken(newToken);
      setIsDemo(true);
      const demoUser = DemoMode.getDemoUser();
      if (demoUser) setUser(demoUser);
      return;
    }
    await setAccessToken(newToken);
    setToken(newToken);
    setIsDemo(false);
    try {
      const me = await authApi.getMe();
      setUser(me);
      registerForPushNotifications().catch(() => {});
    } catch {
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isDemo) {
      await DemoMode.demoLogout();
      setToken(null);
      setUser(null);
      setIsDemo(false);
      return;
    }
    await clearTokens();
    setToken(null);
    setUser(null);
    setIsDemo(false);
  }, [isDemo]);

  const refreshUser = useCallback(async () => {
    if (isDemo) {
      const demoUser = await DemoMode.getDemoLoggedInUser();
      if (demoUser) setUser(demoUser);
      return;
    }
    if (!token) return;
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch { /* ignore */ }
  }, [token, isDemo]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isDemo, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
