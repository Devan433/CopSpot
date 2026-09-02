import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service_role key.
 *
 * This key bypasses Row Level Security and must NEVER be exposed
 * to the browser. It is used exclusively in API route handlers.
 *
 * Set SUPABASE_SERVICE_ROLE_KEY in .env.local (NOT prefixed with NEXT_PUBLIC_).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.\n' +
    '   Get it from: Supabase Dashboard → Settings → API → service_role key\n' +
    '   Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
