import { z } from 'zod';

export const ShippingAddressSchema = z.object({
  street: z.string().trim().min(1, 'يرجى إدخال اسم الشارع / العنوان التفصيلي'),
  city: z.string().trim().min(1, 'يرجى إدخال اسم المدينة'),
  country: z.string().trim().min(2, 'يرجى إدخال رمز الدولة (مثال: SA)'),
  postalCode: z.string().trim().optional(),
});

export const SubmitOrderSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  cartId: z.string().uuid('معرف السلة غير صالح'),
  customerName: z.string().trim().min(2, 'يرجى إدخال اسم العميل الكامل'),
  customerPhone: z.string().trim().min(8, 'يرجى إدخال رقم هاتف صحيح'),
  customerEmail: z
    .string()
    .trim()
    .email('البريد الإلكتروني غير صالح')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  shippingAddress: ShippingAddressSchema.optional(),
  customerNotes: z.string().trim().max(1000, 'الملاحظات طويلة جداً').optional(),
});

export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;
export type SubmitOrderInput = z.infer<typeof SubmitOrderSchema>;
