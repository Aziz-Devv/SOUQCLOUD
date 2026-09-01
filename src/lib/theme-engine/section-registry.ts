import { SectionConfig, SectionSchema } from '@/lib/types';

export type SectionTypeId =
  | 'header'
  | 'hero'
  | 'featured_products'
  | 'banner'
  | 'rich_text'
  | 'footer';

export const SECTION_SCHEMAS: Record<SectionTypeId, SectionSchema> = {
  header: {
    type: 'header',
    name: 'الترويسة (Header)',
    description: 'شريط الترويسة العلوي متضمناً شعار المتجر وقائمة التنقل.',
    fields: [
      { id: 'announcement', type: 'text', label: 'شريط الإعلانات العلوي', default: 'شحن مجاني للطلبات فوق 200 ريال' },
      { id: 'show_announcement', type: 'checkbox', label: 'إظهار شريط الإعلانات', default: true },
      { id: 'logo_url', type: 'image_picker', label: 'شعار المتجر (Logo)' },
    ],
    defaultSettings: {
      announcement: 'شحن مجاني للطلبات فوق 200 ريال',
      show_announcement: true,
      logo_url: '',
    },
  },
  hero: {
    type: 'hero',
    name: 'الواجهة الرئيسية (Hero Banner)',
    description: 'واجهة ترحيبية بارزة بصورة خلفية وعنوان رئيسي وزر طلب.',
    fields: [
      { id: 'heading', type: 'text', label: 'العنوان الرئيسي', default: 'مرحباً بك في متجرنا' },
      { id: 'subheading', type: 'textarea', label: 'العنوان الفرعي', default: 'اكتشف أرقى المنتجات المختارة بعناية فائقة لتناسب ذوقك الرفيع.' },
      { id: 'cta_text', type: 'text', label: 'نص زر الشراء', default: 'تسوق الآن' },
      { id: 'cta_url', type: 'text', label: 'رابط الزر', default: '#products' },
      { id: 'image_url', type: 'image_picker', label: 'صورة الواجهة' },
      {
        id: 'alignment',
        type: 'select',
        label: 'محاذاة النص',
        default: 'center',
        options: [
          { label: 'وسط', value: 'center' },
          { label: 'يمين', value: 'right' },
          { label: 'يسار', value: 'left' },
        ],
      },
    ],
    defaultSettings: {
      heading: 'مرحباً بك في متجرنا',
      subheading: 'اكتشف أرقى المنتجات المختارة بعناية فائقة لتناسب ذوقك الرفيع.',
      cta_text: 'تسوق الآن',
      cta_url: '#products',
      image_url: '',
      alignment: 'center',
    },
  },
  featured_products: {
    type: 'featured_products',
    name: 'المنتجات المميزة (Featured Products)',
    description: 'شبكة لعرض المنتجات المميزة المتاحة في المتجر.',
    fields: [
      { id: 'title', type: 'text', label: 'عنوان القسم', default: 'منتجاتنا المميزة' },
      { id: 'limit', type: 'range', label: 'عدد المنتجات المعروضة', default: 8, min: 2, max: 24, step: 2 },
    ],
    defaultSettings: {
      title: 'منتجاتنا المميزة',
      limit: 8,
    },
  },
  banner: {
    type: 'banner',
    name: 'شريط ترويجي (Promotion Banner)',
    description: 'شريط ترويجي للعروض التخفيضية والمناسبات.',
    fields: [
      { id: 'title', type: 'text', label: 'عنوان العرض', default: 'عرض خاص لفترة محدودة' },
      { id: 'description', type: 'textarea', label: 'تفاصيل العرض', default: 'احصل على خصم 15% عند استخدام كود الخصم.' },
      { id: 'button_text', type: 'text', label: 'نص الزر', default: 'استفد من العرض' },
      { id: 'button_url', type: 'text', label: 'رابط الزر', default: '#' },
    ],
    defaultSettings: {
      title: 'عرض خاص لفترة محدودة',
      description: 'احصل على خصم 15% عند استخدام كود الخصم.',
      button_text: 'استفد من العرض',
      button_url: '#',
    },
  },
  rich_text: {
    type: 'rich_text',
    name: 'نص حر / قصة المتجر (About / Story)',
    description: 'مساحة نصية للتعريف بالمتجر أو تقديم معلومات إضافية للعملاء.',
    fields: [
      { id: 'heading', type: 'text', label: 'العنوان', default: 'قصتنا' },
      { id: 'content', type: 'textarea', label: 'المحتوى', default: 'نحن فخورون بتقديم أفضل المنتجات لعملائنا بأعلى معايير الجودة والضمان.' },
    ],
    defaultSettings: {
      heading: 'قصتنا',
      content: 'نحن فخورون بتقديم أفضل المنتجات لعملائنا بأعلى معايير الجودة والضمان.',
    },
  },
  footer: {
    type: 'footer',
    name: 'التذييل (Footer)',
    description: 'شريط التذييل في أسفل الصفحة لبيانات التواصل وحقوق النشر.',
    fields: [
      { id: 'copyright', type: 'text', label: 'حقوق النشر', default: 'جميع الحقوق محفوظة.' },
      { id: 'description', type: 'textarea', label: 'نبذة عن المتجر', default: 'متجرك الموثوق لأفضل المنتجات.' },
    ],
    defaultSettings: {
      copyright: 'جميع الحقوق محفوظة.',
      description: 'متجرك الموثوق لأفضل المنتجات.',
    },
  },
};

/**
 * Returns available section schemas for a theme template.
 */
export function getAvailableSectionSchemas(_themeTemplateId?: string): SectionSchema[] {
  return Object.values(SECTION_SCHEMAS);
}

/**
 * Strips dangerous HTML tags and scripts from string inputs.
 */
export function sanitizeString(val: string): string {
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(["']).*?\1/gi, '')
    .trim();
}

/**
 * Validates and sanitizes a SectionConfig object.
 */
export function validateSectionConfig(section: SectionConfig): SectionConfig {
  const schema = SECTION_SCHEMAS[section.type as keyof typeof SECTION_SCHEMAS];
  if (!schema) {
    throw new Error(`نوع القسم غير معروف: ${section.type}`);
  }

  const sanitizedSettings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(section.settings || {})) {
    if (typeof value === 'string') {
      sanitizedSettings[key] = sanitizeString(value);
    } else {
      sanitizedSettings[key] = value;
    }
  }

  return {
    id: section.id || `sec_${Math.random().toString(36).substring(2, 9)}`,
    type: section.type,
    settings: { ...schema.defaultSettings, ...sanitizedSettings },
  };
}

/**
 * Returns baseline initial homepage sections for new stores.
 */
export function getDefaultHomepageSections(): SectionConfig[] {
  return [
    {
      id: 'sec_header_1',
      type: 'header',
      settings: SECTION_SCHEMAS['header'].defaultSettings,
    },
    {
      id: 'sec_hero_1',
      type: 'hero',
      settings: SECTION_SCHEMAS['hero'].defaultSettings,
    },
    {
      id: 'sec_featured_1',
      type: 'featured_products',
      settings: SECTION_SCHEMAS['featured_products'].defaultSettings,
    },
    {
      id: 'sec_footer_1',
      type: 'footer',
      settings: SECTION_SCHEMAS['footer'].defaultSettings,
    },
  ];
}
