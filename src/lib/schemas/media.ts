import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
] as const;

export const ALLOWED_PRIVATE_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
] as const;

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
] as const;

export const MAX_MEDIA_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const MediaVisibilityEnum = z.enum(['PUBLIC', 'PRIVATE']);

export const CreatePresignedUploadSchema = z
  .object({
    storeId: z.string().uuid('معرف المتجر غير صالح'),
    filename: z
      .string()
      .min(1, 'اسم الملف مطلوب')
      .max(255, 'اسم الملف طويل جداً')
      .regex(/^[^/\\?%*:|"<>]+$/, 'اسم الملف يحتوي على أحرف غير مسموحة'),
    mimeType: z.enum(ALL_ALLOWED_MIME_TYPES, {
      errorMap: () => ({ message: 'نوع الملف غير مدعوم' }),
    }),
    fileSize: z
      .number()
      .int('حجم الملف يجب أن يكون رقماً صحيحاً')
      .positive('حجم الملف يجب أن يكون أكبر من صفر')
      .max(
        MAX_MEDIA_FILE_SIZE_BYTES,
        'حجم الملف يتجاوز الحد الأقصى المسموح (15 ميجابايت)'
      ),
    visibility: MediaVisibilityEnum.default('PUBLIC'),
  })
  .refine(
    (data) => {
      // PDF documents are strictly PRIVATE only
      if (data.mimeType === 'application/pdf') {
        return data.visibility === 'PRIVATE';
      }
      return true;
    },
    {
      message: 'ملفات PDF مخصصة للمستندات الخاصة فقط (PRIVATE)',
      path: ['visibility'],
    }
  );

export const RegisterMediaAssetSchema = z
  .object({
    storeId: z.string().uuid('معرف المتجر غير صالح'),
    storageKey: z
      .string()
      .min(1, 'مفتاح التخزين مطلوب')
      .max(500, 'مفتاح التخزين طويل جداً')
      .refine((key) => !key.includes('..'), {
        message: 'مفتاح التخزين يحتوي على مسار غير صالح (Path traversal not allowed)',
      }),
    filename: z.string().min(1, 'اسم الملف مطلوب').max(255),
    mimeType: z.enum(ALL_ALLOWED_MIME_TYPES, {
      errorMap: () => ({ message: 'نوع الملف غير مدعوم' }),
    }),
    fileSizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_MEDIA_FILE_SIZE_BYTES),
    visibility: MediaVisibilityEnum,
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    altText: z.string().max(255, 'النص البديل طويل جداً').nullable().optional(),
  })
  .refine(
    (data) => {
      const expectedPrefix = `stores/${data.storeId}/${data.visibility.toLowerCase()}/`;
      return data.storageKey.startsWith(expectedPrefix);
    },
    {
      message: 'مفتاح التخزين لا يطابق النطاق المحدد للمتجر وحالة الخصوصية',
      path: ['storageKey'],
    }
  )
  .refine(
    (data) => {
      if (data.mimeType === 'application/pdf') {
        return data.visibility === 'PRIVATE';
      }
      return true;
    },
    {
      message: 'ملفات PDF مخصصة للمستندات الخاصة فقط (PRIVATE)',
      path: ['visibility'],
    }
  );

export const GetPrivateDownloadUrlSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  assetId: z.string().uuid('معرف الوسيط غير صالح'),
});

export const DeleteMediaAssetSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  assetId: z.string().uuid('معرف الوسيط غير صالح'),
});

export const GetStoreMediaFiltersSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  visibility: MediaVisibilityEnum.optional(),
  mimeTypePrefix: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CreatePresignedUploadInput = z.infer<typeof CreatePresignedUploadSchema>;
export type RegisterMediaAssetInput = z.infer<typeof RegisterMediaAssetSchema>;
export type GetPrivateDownloadUrlInput = z.infer<typeof GetPrivateDownloadUrlSchema>;
export type DeleteMediaAssetInput = z.infer<typeof DeleteMediaAssetSchema>;
export type GetStoreMediaFiltersInput = z.infer<typeof GetStoreMediaFiltersSchema>;
