import { z } from 'zod';

/**
 * Environment Variables Schema & Type-Safe Access
 * Source of Truth: docs/05-infrastructure/supabase-setup.md, docs/05-infrastructure/nextjs-structure.md, docs/05-infrastructure/cloudflare-setup.md
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('souqcloud.com'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder-project.supabase.co'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('placeholder-publishable-key'),
});

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_PURGE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_FALLBACK_ORIGIN: z.string().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('Attempted to access server environment variables from browser-side code!');
  }
  return serverEnvSchema.parse(process.env);
}
