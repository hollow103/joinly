import { create } from 'zustand';

export type SessionStatus = 'anonymous' | 'authenticated';

type SessionState = {
  token: string | null;
  status: SessionStatus;
  setToken: (token: string | null) => void;
  clear: () => void;
};

/**
 * In-memory session for now. M1 wires this to the Supabase session persisted in
 * expo-secure-store.
 */
export const useSession = create<SessionState>((set) => ({
  token: null,
  status: 'anonymous',
  setToken: (token) => set({ token, status: token ? 'authenticated' : 'anonymous' }),
  clear: () => set({ token: null, status: 'anonymous' }),
}));
