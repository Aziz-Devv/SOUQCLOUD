import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const OrderFilterSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  status: OrderStatusEnum.optional(),
  searchQuery: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const UpdateOrderStatusSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  orderId: z.string().uuid('معرف الطلب غير صالح'),
  newStatus: OrderStatusEnum,
  merchantNotes: z.string().trim().max(2000, 'الملاحظات طويلة جداً').optional(),
});

export const CancelOrderSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  orderId: z.string().uuid('معرف الطلب غير صالح'),
  reason: z.string().trim().min(2, 'يرجى توضيح سبب إلغاء الطلب'),
  restockInventory: z.boolean().default(false),
});

export const UpdateOrderNotesSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  orderId: z.string().uuid('معرف الطلب غير صالح'),
  merchantNotes: z.string().trim().max(2000, 'الملاحظات طويلة جداً'),
});

export type OrderFilterInput = z.infer<typeof OrderFilterSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type UpdateOrderNotesInput = z.infer<typeof UpdateOrderNotesSchema>;
