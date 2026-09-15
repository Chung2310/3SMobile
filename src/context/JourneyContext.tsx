import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import type { CustomerJourney } from '@/types/domain';

interface JourneyContextValue {
  journey: CustomerJourney | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);

export function JourneyProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [journey, setJourney] = useState<CustomerJourney | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;

    setError(null);
    setLoading(true);
    setRefreshing(true);
    try {
      const data = await api.get<CustomerJourney>('/api/me/journey');
      setJourney(data || {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu hành trình.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh, session]);

  const value = useMemo(() => ({ journey, loading, refreshing, error, refresh }), [error, journey, loading, refresh, refreshing]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney phải được dùng bên trong JourneyProvider.');
  return context;
}
