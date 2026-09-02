import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service_role key.
 *
 * This key bypasses Row Level Security and must NEVER be exposed
 * to the browser. It is used exclusively in API route handlers.
 *
 * Lazy-initialized to avoid crashing during Next.js build phase
 * when env vars may not be available yet.
 *
 * Set SUPABASE_SERVICE_ROLE_KEY in .env.local (NOT prefixed with NEXT_PUBLIC_).
 */

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. ' +
      'Get service_role key from: Supabase Dashboard → Settings → API'
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}
