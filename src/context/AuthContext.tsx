import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { api } from '@/services/api/client';
import { clearStoredSession, getStoredSession, saveSession } from '@/services/sessionStore';
import type { LoginResponse, Session } from '@/types/domain';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getStoredSession().then((stored) => {
      if (active) {
        setSession(stored);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');

    const response = await api.post<LoginResponse>('/api/auth/login', {
      username: normalizedUsername,
      password,
    });
    const token = response?.token || response?.accessToken;
    const user = response?.user || response?.account;
    if (!token || !user?.id) throw new Error('Phản hồi đăng nhập không hợp lệ.');

    const nextSession: Session = { token, user };
    await saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, loading, signIn, signOut }), [loading, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider.');
  return context;
}
