import { z } from 'zod';

export const ColorScaleSchema = z.object({
  brandPrimary: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  brandHover: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  brandSubtle: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  bgCanvas: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  bgSurface: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  borderSubtle: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  borderStrong: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  textPrimary: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  textSecondary: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
  textMuted: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'رمز لون غير صالح'),
});

export const TypographyScaleSchema = z.object({
  headingFont: z.string().min(1, 'خط العناوين مطلوب'),
  bodyFont: z.string().min(1, 'خط النصوص مطلوب'),
});

export const RadiiScaleSchema = z.object({
  button: z.string().min(1, 'استدارة الأزرار مطلوبة'),
  card: z.string().min(1, 'استدارة البطاقات مطلوبة'),
});

export const DesignTokensSchema = z.object({
  colors: ColorScaleSchema,
  typography: TypographyScaleSchema,
  radii: RadiiScaleSchema,
});

export const ActivateThemeSchema = z.object({
  themeId: z.string().uuid('معرف القالب غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export const UpdateDesignTokensSchema = z.object({
  themeId: z.string().uuid('معرف القالب غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  tokens: DesignTokensSchema,
});

export const SectionConfigSchema = z.object({
  id: z.string().min(1, 'معرف القسم مطلوب'),
  type: z.string().min(1, 'نوع القسم مطلوب'),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export const SaveDraftSectionsSchema = z.object({
  pageId: z.string().uuid('معرف الصفحة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  sections: z.array(SectionConfigSchema),
  expectedVersion: z.number().int().min(1, 'رقم الإصدار المتوقع مطلوب'),
});

export const PublishPageSectionsSchema = z.object({
  pageId: z.string().uuid('معرف الصفحة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export const DiscardDraftSectionsSchema = z.object({
  pageId: z.string().uuid('معرف الصفحة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export const GetPageBuilderDataSchema = z.object({
  pageId: z.string().uuid('معرف الصفحة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export type ActivateThemeInput = z.infer<typeof ActivateThemeSchema>;
export type UpdateDesignTokensInput = z.infer<typeof UpdateDesignTokensSchema>;
export type SaveDraftSectionsInput = z.infer<typeof SaveDraftSectionsSchema>;
export type PublishPageSectionsInput = z.infer<typeof PublishPageSectionsSchema>;
export type DiscardDraftSectionsInput = z.infer<typeof DiscardDraftSectionsSchema>;
export type GetPageBuilderDataInput = z.infer<typeof GetPageBuilderDataSchema>;

