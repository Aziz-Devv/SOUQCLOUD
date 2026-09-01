import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DESIGN_TOKENS,
  THEME_TEMPLATES,
  generateCssVariables,
} from '../src/lib/theme-engine/tokens';
import { DesignTokensSchema } from '../src/lib/schemas/theme';

describe('Theme Engine: Design Tokens & CSS Variable Generation', () => {
  it('validates standard default design tokens', () => {
    const result = DesignTokensSchema.safeParse(DEFAULT_DESIGN_TOKENS);
    expect(result.success).toBe(true);
  });

  it('contains exactly the 3 documented theme presets', () => {
    const keys = Object.keys(THEME_TEMPLATES);
    expect(keys).toEqual(['default-modern', 'minimal-elegance', 'vibrant-retail']);
  });

  it('validates design tokens for all 3 theme templates', () => {
    for (const template of Object.values(THEME_TEMPLATES)) {
      const result = DesignTokensSchema.safeParse(template.defaultTokens);
      expect(result.success).toBe(true);
    }
  });

  it('emits CSS custom properties root string with all required properties', () => {
    const cssVars = generateCssVariables(DEFAULT_DESIGN_TOKENS);
    expect(cssVars).toContain('--color-brand-primary: #0284C7');
    expect(cssVars).toContain('--color-bg-canvas: #F8FAFC');
    expect(cssVars).toContain('--color-text-primary: #0F172A');
    expect(cssVars).toContain('--font-heading:');
    expect(cssVars).toContain('--font-body:');
    expect(cssVars).toContain('--radius-button: 6px');
    expect(cssVars).toContain('--radius-card: 8px');
  });

  it('rejects invalid color hex codes in tokens schema', () => {
    const invalidTokens = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        brandPrimary: 'not-a-hex-color',
      },
    };
    const result = DesignTokensSchema.safeParse(invalidTokens);
    expect(result.success).toBe(false);
  });
});
