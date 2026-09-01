import { z } from 'zod';
import { normalizePhoneNumber, SUPPORTED_COUNTRY_CODES } from '@/lib/utils/phone';

export const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'cart',
  'checkout',
  'dashboard',
  'docs',
  'help',
  'login',
  'mail',
  'register',
  'root',
  'settings',
  'souqcloud',
  'status',
  'store',
  'www',
]);

const handleRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CheckHandleSchema = z.object({
  handle: z
    .string()
    .min(3, 'معرّف المتجر يجب أن يحتوي على 3 أحرف على الأقل')
    .max(63, 'معرّف المتجر يجب ألا يتجاوز 63 حرفاً')
    .toLowerCase()
    .regex(
      handleRegex,
      'معرّف المتجر يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام وشرطات فقط'
    )
    .refine((val) => !RESERVED_HANDLES.has(val), {
      message: 'هذا المعرّف محجوز للنظام، يرجى اختيار معرّف آخر',
    }),
});

export const CreateStoreSchema = z
  .object({
    name: z
      .string()
      .min(2, 'اسم المتجر يجب أن يحتوي على حرفين على الأقل')
      .max(100, 'اسم المتجر يجب ألا يتجاوز 100 حرف'),
    handle: z
      .string()
      .min(3, 'معرّف المتجر يجب أن يحتوي على 3 أحرف على الأقل')
      .max(63, 'معرّف المتجر يجب ألا يتجاوز 63 حرفاً')
      .toLowerCase()
      .regex(
        handleRegex,
        'معرّف المتجر يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام وشرطات فقط'
      )
      .refine((val) => !RESERVED_HANDLES.has(val), {
        message: 'هذا المعرّف محجوز للنظام، يرجى اختيار معرّف آخر',
      }),
    defaultCountryCode: z
      .string()
      .length(2, 'رمز الدولة يجب أن يتكون من حرفين ISO')
      .toUpperCase()
      .refine((val) => SUPPORTED_COUNTRY_CODES.includes(val), {
        message: 'رمز الدولة المحدد غير مدعوم حالياً',
      }),
    currency: z
      .string()
      .length(3, 'رمز العملة يجب أن يتكون من 3 أحرف ISO')
      .toUpperCase()
      .default('SAR'),
    defaultLocale: z.enum(['ar', 'en']).default('ar'),
    orderMode: z.enum(['DASHBOARD', 'WHATSAPP', 'BOTH']).default('BOTH'),
    whatsappPhone: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // If order mode requires WhatsApp, validate and normalize phone
    if (data.orderMode === 'WHATSAPP' || data.orderMode === 'BOTH') {
      if (!data.whatsappPhone || data.whatsappPhone.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['whatsappPhone'],
          message: 'رقم الواتساب مطلوب عند تفعيل استقبال الطلبات عبر الواتساب',
        });
      } else {
        const norm = normalizePhoneNumber(
          data.whatsappPhone,
          data.defaultCountryCode
        );
        if (!norm.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['whatsappPhone'],
            message: norm.error,
          });
        }
      }
    }
  });

export type CheckHandleInput = z.infer<typeof CheckHandleSchema>;
export type CreateStoreSchemaInput = z.infer<typeof CreateStoreSchema>;
