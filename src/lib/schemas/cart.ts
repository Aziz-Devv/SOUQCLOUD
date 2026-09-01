import { z } from 'zod';

export const AddToCartSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  cartId: z.string().uuid('معرف السلة غير صالح').optional(),
  variantId: z.string().uuid('معرف المنتج/الخيار غير صالح'),
  quantity: z.number().int().min(1, 'يجب إضافة قطعة واحدة على الأقل'),
});

export const UpdateCartLineSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  cartId: z.string().uuid('معرف السلة غير صالح'),
  lineId: z.string().uuid('معرف بند السلة غير صالح'),
  quantity: z.number().int().min(0, 'الكمية لا يمكن أن تكون سالبة'),
});

export const RemoveCartLineSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  cartId: z.string().uuid('معرف السلة غير صالح'),
  lineId: z.string().uuid('معرف بند السلة غير صالح'),
});

export const GetCartSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type UpdateCartLineInput = z.infer<typeof UpdateCartLineSchema>;
export type RemoveCartLineInput = z.infer<typeof RemoveCartLineSchema>;
export type GetCartInput = z.infer<typeof GetCartSchema>;
