import { describe, it, expect } from 'vitest';
import { parseHostname } from '../src/proxy';
import { generateCssVariables, THEME_TEMPLATES } from '../src/lib/theme-engine/tokens';
import { getDefaultHomepageSections, validateSectionConfig } from '../src/lib/theme-engine/section-registry';
import { buildCacheTagHeader } from '../src/lib/publishing/cache-invalidation';

describe('Storefront Rendering: Multi-Tenant Hostname Parsing & Design Tokens', () => {
  describe('Hostname Resolution (ADR-002)', () => {
    it('correctly resolves the merchant dashboard host', () => {
      const result = parseHostname('app.souqcloud.com');
      expect(result.isDashboard).toBe(true);
      expect(result.isStorefront).toBe(false);
      expect(result.isMarketing).toBe(false);
      expect(result.handle).toBeNull();
    });

    it('correctly resolves marketing / apex domains', () => {
      const result = parseHostname('souqcloud.com');
      expect(result.isDashboard).toBe(false);
      expect(result.isStorefront).toBe(false);
      expect(result.isMarketing).toBe(true);
      expect(result.handle).toBeNull();
    });

    it('correctly extracts store handle from canonical subdomain', () => {
      const result = parseHostname('luxury-boutique.souqcloud.com');
      expect(result.isDashboard).toBe(false);
      expect(result.isStorefront).toBe(true);
      expect(result.isMarketing).toBe(false);
      expect(result.handle).toBe('luxury-boutique');
    });

    it('correctly extracts store handle from local development subdomain', () => {
      const result = parseHostname('teststore.localhost');
      expect(result.isDashboard).toBe(false);
      expect(result.isStorefront).toBe(true);
      expect(result.handle).toBe('teststore');
    });
  });

  describe('Theme Engine CSS Variables Injection', () => {
    it('generates root CSS custom properties for all active theme templates', () => {
      for (const template of Object.values(THEME_TEMPLATES)) {
        const cssVars = generateCssVariables(template.defaultTokens);
        expect(cssVars).toContain('--color-brand-primary:');
        expect(cssVars).toContain('--color-bg-canvas:');
        expect(cssVars).toContain('--font-heading:');
        expect(cssVars).toContain('--font-body:');
        expect(cssVars).toContain('--radius-button:');
      }
    });
  });

  describe('Published Section Rendering Structure', () => {
    it('provides standard homepage section blocks for public rendering', () => {
      const sections = getDefaultHomepageSections();
      const types = sections.map((s) => s.type);

      expect(types).toContain('header');
      expect(types).toContain('hero');
      expect(types).toContain('featured_products');
      expect(types).toContain('footer');
    });

    it('validates section configurations and prevents script execution', () => {
      const section = validateSectionConfig({
        id: 'sec_1',
        type: 'hero',
        settings: {
          heading: '<script>alert("xss")</script>أحدث المنتجات',
        },
      });

      expect(section.settings['heading']).not.toContain('<script>');
      expect(section.settings['heading']).toContain('أحدث المنتجات');
    });
  });

  describe('Cache-Tag Contract Semantics (docs/05-infrastructure/cloudflare-setup.md)', () => {
    it('formats store-only cache tags correctly', () => {
      const tagHeader = buildCacheTagHeader('store_uuid_1');
      expect(tagHeader).toBe('store_store_uuid_1');
    });

    it('formats store, page, and theme cache tags correctly for published pages', () => {
      const tagHeader = buildCacheTagHeader('store_uuid_1', 'page_uuid_2', 'theme_uuid_3');
      expect(tagHeader).toBe('store_store_uuid_1, page_page_uuid_2, theme_theme_uuid_3');
    });
  });
});
