import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';

/**
 * Browser-Safe Supabase Client
 * Uses exclusively public publishable credentials subject to Postgres Grants & RLS policies.
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
