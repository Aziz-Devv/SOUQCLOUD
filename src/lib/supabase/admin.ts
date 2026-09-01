import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv, getServerEnv } from '../env';

/**
 * Privileged System Admin Client (RESTRICTED USE ONLY)
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. This client bypasses Row Level Security (RLS) using the SUPABASE_SECRET_KEY.
 * 2. It is STRICTLY RESTRICTED to authorized backend webhook processors (e.g. Paddle billing sync),
 *    asynchronous system workers, and migration runner scripts.
 * 3. It must NEVER be imported or used in standard Server Components, Server Actions,
 *    pages, layouts, or storefront routes.
 * 4. It must NEVER be used as a shortcut around RLS or normal tenant authorization.
 */
export function createAdminClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_SECRET_KEY is required to initialize the privileged admin client.');
  }

  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
