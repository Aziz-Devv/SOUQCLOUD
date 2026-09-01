import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration: Identity & Memberships Foundation', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260823000001_identity_and_memberships.sql'
  );

  it('exists and has non-empty content', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content.length).toBeGreaterThan(500);
  });

  it('defines required ENUMs and tables', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TYPE public.merchant_status');
    expect(content).toContain('CREATE TYPE public.membership_role');
    expect(content).toContain('CREATE TYPE public.membership_status');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.users');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.merchants');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.memberships');
  });

  it('declares canonical user trigger on auth.users', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION public.handle_new_auth_user()');
    expect(content).toContain('CREATE TRIGGER on_auth_user_created');
    expect(content).toContain('CREATE TRIGGER on_auth_user_email_updated');
  });

  it('enforces Row Level Security (RLS) on all identity tables', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('CREATE POLICY users_self_manage ON public.users');
    expect(content).toContain('CREATE POLICY merchant_isolation_read ON public.merchants');
    expect(content).toContain('CREATE POLICY membership_read ON public.memberships');
  });

  it('declares explicit Postgres Role Grants in 20260823000002_identity_grants.sql', () => {
    const grantsMigrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20260823000002_identity_grants.sql'
    );
    expect(fs.existsSync(grantsMigrationPath)).toBe(true);
    const content = fs.readFileSync(grantsMigrationPath, 'utf8');
    expect(content).toContain('GRANT ALL ON TABLE public.users TO authenticated;');
    expect(content).toContain('GRANT ALL ON TABLE public.merchants TO authenticated;');
    expect(content).toContain('GRANT ALL ON TABLE public.memberships TO authenticated;');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.get_authenticated_merchant_ids() TO authenticated, service_role;');
  });
});
