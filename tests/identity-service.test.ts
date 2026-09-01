import { describe, it, expect } from 'vitest';
import { generateMerchantSlug } from '../src/lib/services/auth-service';

describe('Merchant Slug Normalization & Collision Handling', () => {
  it('normalizes English business names to lowercase kebab-case', () => {
    const slug = generateMerchantSlug('Aura Studio & Co');
    expect(slug).toBe('aura-studio-co');
  });

  it('normalizes Arabic business names properly', () => {
    const slug = generateMerchantSlug('متجر الأناقة الحديثة');
    expect(slug).toBe('متجر-الأناقة-الحديثة');
  });

  it('collapses multiple whitespace and special characters', () => {
    const slug = generateMerchantSlug('  Super --- Store   !!!  ');
    expect(slug).toBe('super-store');
  });

  it('handles collision suffixing deterministically', () => {
    const slug = generateMerchantSlug('Aura Studio', 'a1b2');
    expect(slug).toBe('aura-studio-a1b2');
  });

  it('falls back to "merchant" if all characters are stripped', () => {
    const slug = generateMerchantSlug('!@#$%^&*()');
    expect(slug).toBe('merchant');
  });
});
