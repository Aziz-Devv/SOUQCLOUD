import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration: Stores & Public Projection View', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260823000003_create_stores.sql'
  );

  it('exists and defines store ENUMs and public.stores table', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TYPE public.store_status');
    expect(content).toContain('CREATE TYPE public.store_order_mode');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.stores');
    expect(content).toContain('merchant_id UUID NOT NULL REFERENCES public.merchants(id)');
    expect(content).toContain('handle VARCHAR(100) NOT NULL UNIQUE');
    expect(content).toContain('default_country_code VARCHAR(2) NOT NULL');
    expect(content).toContain('order_sequence_counter INTEGER NOT NULL DEFAULT 1000');
    expect(content).toContain('CONSTRAINT uq_stores_id_merchant UNIQUE (id, merchant_id)');
  });

  it('creates public.public_stores restricted projection view', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE VIEW public.public_stores AS');
    expect(content).toContain("WHERE status = 'PUBLISHED'");
    
    // Extract only the view definition block
    const viewBlock = content.split('CREATE OR REPLACE VIEW public.public_stores AS')[1]?.split('WHERE status')[0] || '';
    expect(viewBlock).not.toContain('merchant_id'); // Ensure internal merchant_id is excluded from view projection
  });

  it('enforces RLS and Grants on public.stores', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('CREATE POLICY store_isolation_read ON public.stores');
    expect(content).toContain('CREATE POLICY store_creation_insert ON public.stores');
    expect(content).toContain('CREATE POLICY store_isolation_update ON public.stores');
    expect(content).toContain('GRANT ALL ON TABLE public.stores TO authenticated, service_role;');
    expect(content).toContain('GRANT SELECT ON public.public_stores TO anon, authenticated, service_role;');
    expect(content).toContain('REVOKE SELECT ON public.stores FROM anon;');
  });
});
