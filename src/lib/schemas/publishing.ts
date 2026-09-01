import { z } from 'zod';

export const StoreStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'MAINTENANCE', 'ARCHIVED']);

export const PublishStoreSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export const UnpublishStoreSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export const UpdateStoreStatusSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  status: StoreStatusEnum,
});

export const PublishPageSchema = z.object({
  pageId: z.string().uuid('معرف الصفحة غير صالح'),
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export type PublishStoreInput = z.infer<typeof PublishStoreSchema>;
export type UnpublishStoreInput = z.infer<typeof UnpublishStoreSchema>;
export type UpdateStoreStatusInput = z.infer<typeof UpdateStoreStatusSchema>;
export type PublishPageInput = z.infer<typeof PublishPageSchema>;
