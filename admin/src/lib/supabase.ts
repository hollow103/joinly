import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

/**
 * Supabase is used only for the moderator's email/password session. The panel
 * never sends the Supabase `apikey` to the backend and never reads product data
 * from Supabase; all data comes from the Joinly API with the bearer token.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
