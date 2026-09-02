import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { request } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type SessionState =
  | { phase: 'loading' }
  | { phase: 'anonymous' }
  | {
      phase: 'authenticated';
      session: Session;
      profile: Profile | null;
      profileError: string | null;
    };

interface SessionContextValue {
  state: SessionState;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function loadProfile(): Promise<{ profile: Profile | null; error: string | null }> {
  try {
    const { data } = await request<Profile>('/me');
    return { profile: data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el perfil.';
    return { profile: null, error: message };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ phase: 'loading' });

  useEffect(() => {
    let active = true;

    async function hydrate(session: Session | null) {
      if (!active) return;
      if (!session) {
        setState({ phase: 'anonymous' });
        return;
      }
      const { profile, error } = await loadProfile();
      if (!active) return;
      setState({ phase: 'authenticated', session, profile, profileError: error });
    }

    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      reloadProfile: async () => {
        if (state.phase !== 'authenticated') return;
        const { profile, error } = await loadProfile();
        setState((latest) =>
          latest.phase === 'authenticated' ? { ...latest, profile, profileError: error } : latest,
        );
      },
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return ctx;
}
