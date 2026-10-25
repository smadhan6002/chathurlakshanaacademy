import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://xoeizbsngsattbeykuvf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZWl6YnNuZ3NhdHRiZXlrdXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjA2MzYsImV4cCI6MjEwODQ5NjYzNn0._VBOFTcH0vbKYase9tNo2MvIrfYGJWK-ojX-XKRMowA';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('placeholder')
);

// Reusable singleton Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export default supabase;
