import { DesignTokens, ThemeTemplate } from '@/lib/types';

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    brandPrimary: '#0284C7', // Sky 600
    brandHover: '#0369A1',   // Sky 700
    brandSubtle: '#E0F2FE',  // Sky 100
    bgCanvas: '#F8FAFC',     // Slate 50
    bgSurface: '#FFFFFF',
    borderSubtle: '#E2E8F0', // Slate 200
    borderStrong: '#CBD5E1', // Slate 300
    textPrimary: '#0F172A',  // Slate 900
    textSecondary: '#64748B',// Slate 500
    textMuted: '#94A3B8',    // Slate 400
  },
  typography: {
    headingFont: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    bodyFont: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  radii: {
    button: '6px',
    card: '8px',
  },
};

export type ThemeTemplateId = 'default-modern' | 'minimal-elegance' | 'vibrant-retail';

export const THEME_TEMPLATES: Record<ThemeTemplateId, ThemeTemplate> = {
  'default-modern': {
    id: 'default-modern',
    name: 'العصري الأنيق (Default Modern)',
    description: 'قالب تجارة إلكترونية عصري متجاوب ومناسب لكافة المتاجر.',
    defaultTokens: DEFAULT_DESIGN_TOKENS,
  },
  'minimal-elegance': {
    id: 'minimal-elegance',
    name: 'الفخامة الهادئة (Minimal Elegance)',
    description: 'تصميم راقٍ وبسيط يركز على العطور والمجوهرات والأزياء الفاخرة.',
    defaultTokens: {
      colors: {
        brandPrimary: '#18181B', // Zinc 900
        brandHover: '#27272A',
        brandSubtle: '#F4F4F5',
        bgCanvas: '#FAFAFA',
        bgSurface: '#FFFFFF',
        borderSubtle: '#E4E4E7',
        borderStrong: '#D4D4D8',
        textPrimary: '#09090B',
        textSecondary: '#71717A',
        textMuted: '#A1A1AA',
      },
      typography: {
        headingFont: 'Georgia, serif, "Times New Roman"',
        bodyFont: 'Inter, -apple-system, sans-serif',
      },
      radii: {
        button: '2px',
        card: '4px',
      },
    },
  },
  'vibrant-retail': {
    id: 'vibrant-retail',
    name: 'التجزئة الحيوية (Vibrant Retail)',
    description: 'ألوان جذابة وحيوية مناسبة للإلكترونيات والمأكولات والمنتجات الاستهلاكية.',
    defaultTokens: {
      colors: {
        brandPrimary: '#EA580C', // Orange 600
        brandHover: '#C2410C',
        brandSubtle: '#FFEDD5',
        bgCanvas: '#FFFBEB',     // Amber 50
        bgSurface: '#FFFFFF',
        borderSubtle: '#FDE68A',
        borderStrong: '#FCD34D',
        textPrimary: '#451A03',  // Amber 950
        textSecondary: '#78350F',
        textMuted: '#92400E',
      },
      typography: {
        headingFont: 'Outfit, -apple-system, sans-serif',
        bodyFont: 'Inter, -apple-system, sans-serif',
      },
      radii: {
        button: '10px',
        card: '12px',
      },
    },
  },
};

/**
 * Generates root CSS custom properties from DesignTokens.
 */
export function generateCssVariables(tokens: DesignTokens): string {
  const { colors, typography, radii } = tokens;

  return `
    --color-brand-primary: ${colors.brandPrimary};
    --color-brand-hover: ${colors.brandHover};
    --color-brand-subtle: ${colors.brandSubtle};
    --color-bg-canvas: ${colors.bgCanvas};
    --color-bg-surface: ${colors.bgSurface};
    --color-border-subtle: ${colors.borderSubtle};
    --color-border-strong: ${colors.borderStrong};
    --color-text-primary: ${colors.textPrimary};
    --color-text-secondary: ${colors.textSecondary};
    --color-text-muted: ${colors.textMuted};
    --font-heading: ${typography.headingFont};
    --font-body: ${typography.bodyFont};
    --radius-button: ${radii.button};
    --radius-card: ${radii.card};
  `.trim();
}
