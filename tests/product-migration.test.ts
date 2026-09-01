import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration: Products & Variants Catalog', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260823000004_create_products_and_variants.sql'
  );

  it('exists and defines product ENUMs and tables', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TYPE public.product_status');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.products');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.variants');
    expect(content).toContain('store_id UUID NOT NULL REFERENCES public.stores(id)');
    expect(content).toContain('price_cents BIGINT NOT NULL CHECK (price_cents >= 0)');
    expect(content).toContain('CONSTRAINT uq_products_id_store UNIQUE (id, store_id)');
    expect(content).toContain('CONSTRAINT uq_store_product_handle UNIQUE (store_id, handle)');
    expect(content).toContain('CONSTRAINT uq_store_variant_sku UNIQUE (store_id, sku)');
    expect(content).toContain('CONSTRAINT chk_inventory_backorder CHECK (inventory_quantity >= 0 OR allow_backorder = TRUE)');
  });

  it('enforces Row Level Security and Grants on products and variants', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('CREATE POLICY product_isolation_read ON public.products');
    expect(content).toContain('CREATE POLICY variant_isolation_read ON public.variants');
    expect(content).toContain('CREATE POLICY public_product_read ON public.products');
    expect(content).toContain('CREATE POLICY public_variant_read ON public.variants');
    expect(content).toContain('GRANT ALL ON TABLE public.products TO authenticated, service_role;');
    expect(content).toContain('GRANT ALL ON TABLE public.variants TO authenticated, service_role;');
    expect(content).toContain('GRANT SELECT ON TABLE public.products TO anon;');
    expect(content).toContain('GRANT SELECT ON TABLE public.variants TO anon;');
  });

  it('defines get_published_store_ids helper and aligned policies in 20260823000005', () => {
    const helperMigrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20260823000005_product_public_read_helper.sql'
    );
    expect(fs.existsSync(helperMigrationPath)).toBe(true);
    const content = fs.readFileSync(helperMigrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION public.get_published_store_ids()');
    expect(content).toContain('store_id IN (SELECT public.get_published_store_ids())');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.get_published_store_ids() TO anon, authenticated, service_role;');
  });
});
