import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// NOTE: Enable Row Level Security (RLS) on both 'reports' and 'messages' tables
// in the Supabase dashboard to prevent unauthorized data manipulation.
// Without RLS, anyone with the anon key can delete/modify ALL data via the REST API.
//
// For fully typed Supabase client, generate types with:
//   npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
// Then use: createClient<Database>(supabaseUrl, supabaseAnonKey)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
