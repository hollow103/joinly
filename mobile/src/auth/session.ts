import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/auth/supabase';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

type SessionState = {
  token: string | null;
  status: SessionStatus;
  setSession: (session: Session | null) => void;
  clear: () => void;
};

export const useSession = create<SessionState>((set) => ({
  token: null,
  status: 'loading',
  setSession: (session) =>
    set({ token: session?.access_token ?? null, status: session ? 'authenticated' : 'anonymous' }),
  clear: () => set({ token: null, status: 'anonymous' }),
}));

export function startSessionLifecycle() {
  const { setSession } = useSession.getState();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  const appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  void supabase.auth.getSession().then(({ data: sessionData }) => setSession(sessionData.session));
  supabase.auth.startAutoRefresh();

  return () => {
    data.subscription.unsubscribe();
    appStateSubscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
