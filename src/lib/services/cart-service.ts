import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { AppError, ConflictError } from '@/lib/errors';

export const CART_COOKIE_NAME = 'souqcloud_cart_token';

export interface CartLineItem {
  id: string;
  cartId: string;
  storeId: string;
  productId: string;
  variantId: string;
  quantity: number;
  productTitle: string;
  productHandle: string;
  variantTitle: string;
  sku: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  inventoryQuantity: number;
  allowBackorder: boolean;
  optionValues: Record<string, string>;
  images: string[];
}

export interface StorefrontCart {
  id: string;
  storeId: string;
  sessionToken: string;
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED';
  currency: string;
  expiresAt: string;
  lines: CartLineItem[];
  itemCount: number;
  subtotalCents: number;
}

/**
 * Retrieves the active session token from HttpOnly cookie or creates a new one.
 */
export async function getOrCreateCartSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (existingToken && existingToken.trim().length >= 16) {
    return existingToken.trim();
  }

  const newToken = crypto.randomUUID();
  try {
    cookieStore.set(CART_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // In read-only Server Component render contexts, setting cookie is caught gracefully
  }

  return newToken;
}

function parseCartResponse(data: Record<string, unknown>): StorefrontCart {
  const rawLines = Array.isArray(data['lines']) ? data['lines'] : [];
  const lines: CartLineItem[] = rawLines.map((l: Record<string, unknown>) => ({
    id: String(l['id']),
    cartId: String(l['cart_id']),
    storeId: String(l['store_id']),
    productId: String(l['product_id']),
    variantId: String(l['variant_id']),
    quantity: Number(l['quantity']) || 1,
    productTitle: String(l['product_title'] || ''),
    productHandle: String(l['product_handle'] || ''),
    variantTitle: String(l['variant_title'] || ''),
    sku: l['sku'] ? String(l['sku']) : null,
    priceCents: Number(l['price_cents']) || 0,
    compareAtPriceCents: l['compare_at_price_cents'] ? Number(l['compare_at_price_cents']) : null,
    inventoryQuantity: Number(l['inventory_quantity']) || 0,
    allowBackorder: Boolean(l['allow_backorder']),
    optionValues: (l['option_values'] as Record<string, string>) || {},
    images: Array.isArray(l['images']) ? (l['images'] as string[]) : [],
  }));

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  return {
    id: String(data['id']),
    storeId: String(data['store_id']),
    sessionToken: String(data['session_token']),
    status: data['status'] as 'ACTIVE' | 'CONVERTED' | 'EXPIRED',
    currency: String(data['currency']),
    expiresAt: String(data['expires_at']),
    lines,
    itemCount,
    subtotalCents,
  };
}

/**
 * Retrieves or initializes an active storefront cart via SECURITY DEFINER RPC.
 */
export async function getOrCreateCart(storeId: string): Promise<StorefrontCart> {
  const sessionToken = await getOrCreateCartSessionToken();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_or_create_storefront_cart', {
    p_store_id: storeId,
    p_session_token: sessionToken,
  });

  if (error || !data) {
    logger.error('Failed to get or create storefront cart', {
      storeId,
      error: error?.message,
    });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل سلة المشتريات');
  }

  return parseCartResponse(data as Record<string, unknown>);
}

/**
 * Adds an item to the cart via SECURITY DEFINER RPC.
 */
export async function addToCart(
  storeId: string,
  variantId: string,
  quantity: number,
  cartId?: string
): Promise<StorefrontCart> {
  const sessionToken = await getOrCreateCartSessionToken();
  const supabase = await createClient();

  let targetCartId = cartId;
  if (!targetCartId) {
    const currentCart = await getOrCreateCart(storeId);
    targetCartId = currentCart.id;
  }

  const { data, error } = await supabase.rpc('add_storefront_cart_item', {
    p_store_id: storeId,
    p_cart_id: targetCartId,
    p_session_token: sessionToken,
    p_variant_id: variantId,
    p_quantity: quantity,
  });

  if (error || !data) {
    if (error?.message?.includes('INSUFFICIENT_INVENTORY')) {
      throw new ConflictError('الكمية المطلوبة غير متوفرة في المخزون');
    }
    logger.error('Failed to add item to cart', { storeId, variantId, error: error?.message });
    throw new AppError('INTERNAL_ERROR', 'فشل إضافة المنتج إلى السلة');
  }

  return parseCartResponse(data as Record<string, unknown>);
}

/**
 * Updates a line item's quantity via SECURITY DEFINER RPC.
 */
export async function updateCartLine(
  storeId: string,
  cartId: string,
  lineId: string,
  quantity: number
): Promise<StorefrontCart> {
  const sessionToken = await getOrCreateCartSessionToken();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('update_storefront_cart_item', {
    p_store_id: storeId,
    p_cart_id: cartId,
    p_session_token: sessionToken,
    p_line_id: lineId,
    p_quantity: quantity,
  });

  if (error || !data) {
    if (error?.message?.includes('INSUFFICIENT_INVENTORY')) {
      throw new ConflictError('الكمية المطلوبة غير متوفرة في المخزون');
    }
    logger.error('Failed to update cart line', { storeId, cartId, lineId, error: error?.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحديث كمية المنتج');
  }

  return parseCartResponse(data as Record<string, unknown>);
}

/**
 * Removes a line item from the cart via SECURITY DEFINER RPC.
 */
export async function removeCartLine(
  storeId: string,
  cartId: string,
  lineId: string
): Promise<StorefrontCart> {
  const sessionToken = await getOrCreateCartSessionToken();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('remove_storefront_cart_item', {
    p_store_id: storeId,
    p_cart_id: cartId,
    p_session_token: sessionToken,
    p_line_id: lineId,
  });

  if (error || !data) {
    logger.error('Failed to remove cart line', { storeId, cartId, lineId, error: error?.message });
    throw new AppError('INTERNAL_ERROR', 'فشل حذف المنتج من السلة');
  }

  return parseCartResponse(data as Record<string, unknown>);
}
