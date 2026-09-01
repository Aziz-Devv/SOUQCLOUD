import { describe, it, expect } from 'vitest';
import {
  GetPageBuilderDataSchema,
  SaveDraftSectionsSchema,
  PublishPageSectionsSchema,
  DiscardDraftSectionsSchema,
} from '../src/lib/schemas/theme';
import {
  SECTION_SCHEMAS,
  validateSectionConfig,
  getDefaultHomepageSections,
} from '../src/lib/theme-engine/section-registry';
import { generateCssVariables, THEME_TEMPLATES } from '../src/lib/theme-engine/tokens';

describe('Store Builder / Visual Editor Primitives', () => {
  describe('Editor Data Schemas', () => {
    it('validates a valid GetPageBuilderData payload', () => {
      const result = GetPageBuilderDataSchema.safeParse({
        pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUIDs in GetPageBuilderData', () => {
      const result = GetPageBuilderDataSchema.safeParse({
        pageId: 'invalid-id',
        storeId: 'invalid-id',
      });
      expect(result.success).toBe(false);
    });

    it('validates a draft save payload with expectedVersion', () => {
      const result = SaveDraftSectionsSchema.safeParse({
        pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
        expectedVersion: 2,
        sections: [
          {
            id: 'sec_hero_1',
            type: 'hero',
            settings: { heading: 'New Heading', cta_text: 'Buy Now' },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('validates publish and discard schemas', () => {
      const pubResult = PublishPageSectionsSchema.safeParse({
        pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      });
      expect(pubResult.success).toBe(true);

      const discResult = DiscardDraftSectionsSchema.safeParse({
        pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      });
      expect(discResult.success).toBe(true);
    });
  });

  describe('Section Manipulation & Hierarchy', () => {
    it('initializes default homepage sections with header, hero, featured products, and footer', () => {
      const sections = getDefaultHomepageSections();
      expect(sections.length).toBe(4);
      expect(sections.map((s) => s.type)).toEqual([
        'header',
        'hero',
        'featured_products',
        'footer',
      ]);
    });

    it('validates section configurations and applies defaults from schema', () => {
      const config = validateSectionConfig({
        id: 'sec_test',
        type: 'hero',
        settings: {
          heading: 'مرحباً بكم في متجرنا الجديد',
        },
      });

      expect(config.id).toBe('sec_test');
      expect(config.type).toBe('hero');
      expect(config.settings['heading']).toBe('مرحباً بكم في متجرنا الجديد');
      expect(config.settings['cta_text']).toBe(SECTION_SCHEMAS.hero.defaultSettings['cta_text']);
    });

    it('sanitizes script injections from section text fields', () => {
      const config = validateSectionConfig({
        id: 'sec_hacked',
        type: 'banner',
        settings: {
          title: '<script>evil()</script>خصم 20%',
          description: 'تفاصيل العرض',
        },
      });

      expect(config.settings['title']).not.toContain('<script>');
      expect(config.settings['title']).toContain('خصم 20%');
    });
  });

  describe('Theme Engine & Design Tokens Integration', () => {
    it('generates proper CSS variables for the active theme template', () => {
      const modernTheme = THEME_TEMPLATES['default-modern'];
      const cssVars = generateCssVariables(modernTheme.defaultTokens);

      expect(cssVars).toContain('--color-brand-primary: #0284C7');
      expect(cssVars).toContain('--color-bg-canvas: #F8FAFC');
      expect(cssVars).toContain('--radius-button: 6px');
    });
  });
});
