import { describe, it, expect } from 'vitest';
import { publicEnv } from '../src/lib/env';

describe('Environment Variables Boundary', () => {
  it('loads valid public environment configuration defaults', () => {
    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(publicEnv.NEXT_PUBLIC_ROOT_DOMAIN).toBe('souqcloud.com');
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
  });
});
