import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase';

// Separate from the public client: admins need a persisted, refreshing
// session, visitors submitting a profile should stay anonymous.
export const adminSupabase = isSupabaseConfigured
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storageKey: 'tkpool-admin-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
