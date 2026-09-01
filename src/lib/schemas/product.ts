import { z } from 'zod';

export const ProductOptionSchema = z.object({
  name: z.string().min(1, 'اسم الخاصية مطلوب').max(50, 'اسم الخاصية طويل جداً'),
  values: z
    .array(z.string().min(1, 'قيمة الخاصية مطلوبة'))
    .min(1, 'يجب تحديد قيمة واحدة على الأقل لكل خاصية'),
});

export const VariantInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, 'عنوان النسخة مطلوب').default('Default Variant'),
    sku: z.string().max(100, 'رمز SKU يجب ألا يتجاوز 100 حرف').optional().nullable(),
    barcode: z.string().max(100, 'الباركود يجب ألا يتجاوز 100 حرف').optional().nullable(),
    priceCents: z
      .number()
      .int('السعر بالهللات يجب أن يكون رقماً صحيحاً')
      .min(0, 'السعر يجب أن يكون 0 أو أكثر'),
    compareAtPriceCents: z
      .number()
      .int('السعر قبل الخصم يجب أن يكون رقماً صحيحاً')
      .min(0, 'السعر قبل الخصم يجب أن يكون 0 أو أكثر')
      .optional()
      .nullable(),
    inventoryQuantity: z
      .number()
      .int('كمية المخزون يجب أن تكون رقماً صحيحاً')
      .default(0),
    allowBackorder: z.boolean().default(false),
    optionValues: z.record(z.string(), z.string()).default({}),
    position: z.number().int().default(0),
  })
  .refine(
    (data) => data.allowBackorder || data.inventoryQuantity >= 0,
    {
      message: 'كمية المخزون لا يمكن أن تكون سالبة ما لم يتم تفعيل الشراء عند النفاد',
      path: ['inventoryQuantity'],
    }
  );

export const CreateProductSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  title: z
    .string()
    .min(2, 'اسم المنتج يجب أن يحتوي على حرفين على الأقل')
    .max(255, 'اسم المنتج يجب ألا يتجاوز 255 حرفاً'),
  handle: z
    .string()
    .min(2, 'معرف الرابط يجب أن يحتوي على حرفين على الأقل')
    .max(255, 'معرف الرابط يجب ألا يتجاوز 255 حرفاً')
    .optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  options: z.array(ProductOptionSchema).default([]),
  variants: z.array(VariantInputSchema).optional(),
  // Fallback single variant attributes if variants array is not supplied
  basePriceCents: z.number().int().min(0).default(0),
  compareAtPriceCents: z.number().int().min(0).optional().nullable(),
  inventoryQuantity: z.number().int().default(0),
  allowBackorder: z.boolean().default(false),
  sku: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateProductSchema = z.object({
  productId: z.string().uuid('معرف المنتج غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  title: z
    .string()
    .min(2, 'اسم المنتج يجب أن يحتوي على حرفين على الأقل')
    .max(255, 'اسم المنتج يجب ألا يتجاوز 255 حرفاً')
    .optional(),
  handle: z.string().min(2).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  options: z.array(ProductOptionSchema).optional(),
  variants: z.array(VariantInputSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateInventorySchema = z.object({
  variantId: z.string().uuid('معرف النسخة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  quantity: z.number().int('الكمية يجب أن تكون رقماً صحيحاً'),
});

export const DeleteProductSchema = z.object({
  productId: z.string().uuid('معرف المنتج غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export type CreateProductSchemaInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductSchemaInput = z.infer<typeof UpdateProductSchema>;
export type UpdateInventorySchemaInput = z.infer<typeof UpdateInventorySchema>;
export type DeleteProductSchemaInput = z.infer<typeof DeleteProductSchema>;
