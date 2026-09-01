import { createClient } from '@/lib/supabase/server';
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { ProductDetail, ProductSummary, Variant } from '@/lib/types';
import {
  CreateProductSchemaInput,
  UpdateProductSchemaInput,
} from '@/lib/schemas/product';

/**
 * Normalizes a product title into a URL-friendly handle slug.
 */
export function generateProductSlug(title: string, suffix?: string): string {
  let normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Keep Unicode letters (Arabic/Latin), numbers, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

  if (!normalized) {
    normalized = 'product';
  }

  return suffix ? `${normalized}-${suffix}` : normalized;
}

/**
 * Retrieves all products for a given store with variant summaries.
 */
export async function getStoreProducts(
  storeId: string,
  filters?: { status?: string; search?: string }
): Promise<ProductSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select(`
      id,
      store_id,
      title,
      handle,
      status,
      created_at,
      variants (
        id,
        price_cents,
        compare_at_price_cents,
        inventory_quantity
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search && filters.search.trim().length > 0) {
    query = query.ilike('title', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch store products', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع قائمة المنتجات.');
  }

  return (data || []).map((row) => {
    const variants = (row.variants as Array<{
      id: string;
      price_cents: number;
      compare_at_price_cents?: number | null;
      inventory_quantity: number;
    }>) || [];

    const basePriceCents = variants.length > 0
      ? Math.min(...variants.map((v) => Number(v.price_cents)))
      : 0;

    const firstVariant = variants[0];
    const compareAtPriceCents = firstVariant && firstVariant.compare_at_price_cents != null
      ? Number(firstVariant.compare_at_price_cents)
      : null;

    const totalInventory = variants.reduce(
      (sum, v) => sum + Number(v.inventory_quantity || 0),
      0
    );

    return {
      id: row.id,
      storeId: row.store_id,
      title: row.title,
      handle: row.handle,
      status: row.status,
      basePriceCents,
      compareAtPriceCents,
      variantsCount: variants.length,
      totalInventory,
      createdAt: row.created_at,
    };
  });
}

/**
 * Retrieves full product details and all variants by ID.
 */
export async function getProductDetailById(
  productId: string,
  storeId: string
): Promise<ProductDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      variants (*)
    `)
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching product detail', { productId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع تفاصيل المنتج.');
  }

  if (!data) {
    throw new NotFoundError('المنتج المطلوب غير موجود.');
  }

  const variants: Variant[] = ((data.variants as Array<Record<string, unknown>>) || []).map((v) => ({
    id: v.id as string,
    storeId: v.store_id as string,
    productId: v.product_id as string,
    title: v.title as string,
    sku: v.sku as string | null,
    barcode: v.barcode as string | null,
    priceCents: Number(v.price_cents),
    compareAtPriceCents: v.compare_at_price_cents != null ? Number(v.compare_at_price_cents) : null,
    inventoryQuantity: Number(v.inventory_quantity),
    allowBackorder: Boolean(v.allow_backorder),
    optionValues: (v.option_values as Record<string, string>) || {},
    position: Number(v.position || 0),
    createdAt: v.created_at as string,
    updatedAt: v.updated_at as string,
  }));

  return {
    id: data.id,
    storeId: data.store_id,
    title: data.title,
    handle: data.handle,
    description: data.description,
    status: data.status,
    options: data.options || [],
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    deletedAt: data.deleted_at,
    variants,
  };
}

/**
 * Creates a new Product with single or multi-variants atomically.
 */
export async function createProduct(
  input: CreateProductSchemaInput
): Promise<{ productId: string; handle: string; product: ProductDetail }> {
  const supabase = await createClient();

  // 1. Generate unique product handle within the store
  let handle = input.handle ? generateProductSlug(input.handle) : generateProductSlug(input.title);

  // Check handle existence in store
  const { data: existingHandle } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', input.storeId)
    .eq('handle', handle)
    .maybeSingle();

  if (existingHandle) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    handle = generateProductSlug(input.title, randomSuffix);
  }

  // 2. Insert Parent Product
  const { data: productRow, error: productError } = await supabase
    .from('products')
    .insert({
      store_id: input.storeId,
      title: input.title.trim(),
      handle,
      description: input.description?.trim() || null,
      status: input.status || 'DRAFT',
      options: input.options || [],
      metadata: input.metadata || {},
    })
    .select('*')
    .single();

  if (productError) {
    logger.error('Failed to insert product record', {
      storeId: input.storeId,
      handle,
      error: productError.message,
    });
    if (productError.code === '23505') {
      throw new ConflictError('رابط المنتج (Handle) مستخدم بالفعل في هذا المتجر.');
    }
    if (productError.code === '42501') {
      throw new ForbiddenError('غير مصرح لك بإضافة منتجات في هذا المتجر.');
    }
    throw new InternalError('حدث خطأ أثناء إضافة المنتج.');
  }

  // 3. Prepare Variants to Insert
  const variantsToInsert: Array<Record<string, unknown>> = [];

  if (input.variants && input.variants.length > 0) {
    // Multi-variants or explicitly configured variants
    input.variants.forEach((v, index) => {
      variantsToInsert.push({
        store_id: input.storeId,
        product_id: productRow.id,
        title: v.title || 'Default Variant',
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
        price_cents: v.priceCents,
        compare_at_price_cents: v.compareAtPriceCents != null ? v.compareAtPriceCents : null,
        inventory_quantity: v.inventoryQuantity ?? 0,
        allow_backorder: Boolean(v.allowBackorder),
        option_values: v.optionValues || {},
        position: v.position ?? index,
      });
    });
  } else {
    // Default Single Variant
    variantsToInsert.push({
      store_id: input.storeId,
      product_id: productRow.id,
      title: 'Default Variant',
      sku: input.sku?.trim() || null,
      barcode: null,
      price_cents: input.basePriceCents ?? 0,
      compare_at_price_cents: input.compareAtPriceCents != null ? input.compareAtPriceCents : null,
      inventory_quantity: input.inventoryQuantity ?? 0,
      allow_backorder: Boolean(input.allowBackorder),
      option_values: {},
      position: 0,
    });
  }

  // 4. Insert Variants
  const { data: variantRows, error: variantError } = await supabase
    .from('variants')
    .insert(variantsToInsert)
    .select('*');

  if (variantError) {
    logger.error('Failed to insert variant records', {
      productId: productRow.id,
      error: variantError.message,
    });
    // Rollback: delete created product if variants fail
    await supabase.from('products').delete().eq('id', productRow.id);
    if (variantError.code === '23505') {
      throw new ConflictError('رمز SKU مكرر لنسخة أخرى في هذا المتجر.');
    }
    if (variantError.code === '23514') {
      throw new ValidationError('بيانات السعر أو المخزون غير صالحة.');
    }
    throw new InternalError('حدث خطأ أثناء حفظ نسخ المنتج.');
  }

  logger.info('Product created successfully', {
    productId: productRow.id,
    storeId: input.storeId,
    handle: productRow.handle,
    variantsCount: (variantRows || []).length,
  });

  const createdVariants: Variant[] = (variantRows || []).map((v) => ({
    id: v.id,
    storeId: v.store_id,
    productId: v.product_id,
    title: v.title,
    sku: v.sku,
    barcode: v.barcode,
    priceCents: Number(v.price_cents),
    compareAtPriceCents: v.compare_at_price_cents != null ? Number(v.compare_at_price_cents) : null,
    inventoryQuantity: Number(v.inventory_quantity),
    allowBackorder: Boolean(v.allow_backorder),
    optionValues: v.option_values || {},
    position: Number(v.position || 0),
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }));

  const fullProduct: ProductDetail = {
    id: productRow.id,
    storeId: productRow.store_id,
    title: productRow.title,
    handle: productRow.handle,
    description: productRow.description,
    status: productRow.status,
    options: productRow.options || [],
    metadata: productRow.metadata || {},
    createdAt: productRow.created_at,
    updatedAt: productRow.updated_at,
    deletedAt: productRow.deleted_at,
    variants: createdVariants,
  };

  return {
    productId: fullProduct.id,
    handle: fullProduct.handle,
    product: fullProduct,
  };
}

/**
 * Updates an existing Product and its variants.
 */
export async function updateProduct(
  input: UpdateProductSchemaInput
): Promise<{ productId: string }> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.handle !== undefined) updatePayload.handle = generateProductSlug(input.handle);
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.options !== undefined) updatePayload.options = input.options;

  const { error: updateError } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', input.productId)
    .eq('store_id', input.storeId);

  if (updateError) {
    logger.error('Failed to update product', {
      productId: input.productId,
      error: updateError.message,
    });
    if (updateError.code === '23505') {
      throw new ConflictError('رابط المنتج (Handle) مستخدم بالفعل في هذا المتجر.');
    }
    throw new InternalError('حدث خطأ أثناء تعديل بيانات المنتج.');
  }

  // Update variants if supplied
  if (input.variants && input.variants.length > 0) {
    for (const v of input.variants) {
      if (v.id) {
        await supabase
          .from('variants')
          .update({
            title: v.title,
            sku: v.sku?.trim() || null,
            barcode: v.barcode?.trim() || null,
            price_cents: v.priceCents,
            compare_at_price_cents: v.compareAtPriceCents != null ? v.compareAtPriceCents : null,
            inventory_quantity: v.inventoryQuantity ?? 0,
            allow_backorder: Boolean(v.allowBackorder),
            option_values: v.optionValues || {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', v.id)
          .eq('store_id', input.storeId);
      }
    }
  }

  return { productId: input.productId };
}

/**
 * Deletes a product and cascades to variants.
 */
export async function deleteProduct(
  productId: string,
  storeId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('store_id', storeId);

  if (error) {
    logger.error('Failed to delete product', { productId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء حذف المنتج.');
  }
}

/**
 * Updates a specific variant inventory quantity.
 */
export async function updateVariantInventory(
  variantId: string,
  storeId: string,
  quantity: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('variants')
    .update({
      inventory_quantity: quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', variantId)
    .eq('store_id', storeId);

  if (error) {
    logger.error('Failed to update variant inventory', { variantId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء تحديث كمية المخزون.');
  }
}
