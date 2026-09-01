import { describe, it, expect } from 'vitest';
import {
  SECTION_SCHEMAS,
  getAvailableSectionSchemas,
  validateSectionConfig,
  sanitizeString,
  getDefaultHomepageSections,
} from '../src/lib/theme-engine/section-registry';

describe('Theme Engine: Section Registry & Validation', () => {
  it('contains standard declarative section schemas', () => {
    const schemas = getAvailableSectionSchemas();
    const types = schemas.map((s) => s.type);
    expect(types).toContain('header');
    expect(types).toContain('hero');
    expect(types).toContain('featured_products');
    expect(types).toContain('banner');
    expect(types).toContain('rich_text');
    expect(types).toContain('footer');
  });

  it('sanitizes script tags from string inputs', () => {
    const malicious = '<script>alert("hacked")</script>مرحباً بك';
    const cleaned = sanitizeString(malicious);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('</script>');
    expect(cleaned).toContain('مرحباً بك');
  });

  it('validates and applies defaults to a section config', () => {
    const validated = validateSectionConfig({
      id: 'test_sec',
      type: 'hero',
      settings: {
        heading: 'عروض حصرية',
      },
    });

    expect(validated.id).toBe('test_sec');
    expect(validated.type).toBe('hero');
    expect(validated.settings['heading']).toBe('عروض حصرية');
    expect(validated.settings['cta_text']).toBe(SECTION_SCHEMAS.hero.defaultSettings['cta_text']);
  });

  it('throws an error when validating an unknown section type', () => {
    expect(() => {
      validateSectionConfig({
        id: 'bad_sec',
        type: 'unknown_custom_script_runner',
        settings: {},
      });
    }).toThrow('نوع القسم غير معروف');
  });

  it('provides default homepage sections with header, hero, featured products, and footer', () => {
    const defaultSections = getDefaultHomepageSections();
    expect(defaultSections.length).toBe(4);
    const types = defaultSections.map((s) => s.type);
    expect(types).toEqual(['header', 'hero', 'featured_products', 'footer']);
  });
});
