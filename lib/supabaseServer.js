// lib/supabaseServer.js
// Server-side supabase client with service role key (keep SECRET)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase server env vars missing. Ensure SUPABASE_SERVICE_ROLE_KEY is set (server-only).');
}

// createClient works both server and client; here we pass service role key for privileged actions
export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
