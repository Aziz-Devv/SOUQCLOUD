import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration: Themes & Pages', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260823000006_create_themes_and_pages.sql'
  );

  it('exists and defines page_type ENUM, themes, and pages tables', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TYPE public.page_type');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.themes');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.pages');
    expect(content).toContain('store_id UUID NOT NULL REFERENCES public.stores(id)');
    expect(content).toContain('CONSTRAINT uq_themes_id_store UNIQUE (id, store_id)');
    expect(content).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_active_store ON public.themes(store_id) WHERE (is_active = TRUE)');
    expect(content).toContain('CONSTRAINT uq_pages_id_store UNIQUE (id, store_id)');
    expect(content).toContain('CONSTRAINT uq_store_page_slug UNIQUE (store_id, slug)');
    expect(content).toContain('version INTEGER NOT NULL DEFAULT 1');
  });

  it('enforces Row Level Security and Grants on themes and pages', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;');
    expect(content).toContain('CREATE POLICY theme_isolation_read ON public.themes');
    expect(content).toContain('CREATE POLICY page_isolation_read ON public.pages');
    expect(content).toContain('CREATE POLICY public_theme_read ON public.themes');
    expect(content).toContain('CREATE POLICY public_page_read ON public.pages');
    expect(content).toContain('GRANT ALL ON TABLE public.themes TO authenticated, service_role;');
    expect(content).toContain('GRANT ALL ON TABLE public.pages TO authenticated, service_role;');
    expect(content).toContain('GRANT SELECT ON TABLE public.themes TO anon;');
    expect(content).toContain('GRANT SELECT ON TABLE public.pages TO anon;');
  });
});
