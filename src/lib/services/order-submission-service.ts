import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '@/lib/errors';
import { normalizePhoneNumber } from '@/lib/utils/phone';
import { getOrCreateCartSessionToken } from './cart-service';
import { generateWhatsAppUrl, WhatsAppOrderDetails } from '@/lib/checkout/whatsapp-formatter';
import { SubmitOrderInput } from '@/lib/schemas/order-submission';
import { dispatchNotification } from './notification-service';

export interface OrderSubmissionResult {
  orderId: string;
  orderNumber: number;
  confirmationToken: string;
  orderModeUsed: 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  currency: string;
  totalCents: number;
  whatsappRedirectUrl: string | null;
}

export interface ConfirmedOrderLineItem {
  id: string;
  title: string;
  variantTitle: string;
  sku: string | null;
  unitPriceCents: number;
  taxCents: number;
  quantity: number;
  totalPriceCents: number;
}

export interface ConfirmedOrderDetails {
  id: string;
  storeId: string;
  storeName: string;
  orderNumber: number;
  status: string;
  orderModeUsed: 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } | null;
  customerNotes: string | null;
  whatsappRedirectUrl: string | null;
  whatsappPhone: string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  lineItems: ConfirmedOrderLineItem[];
}

/**
 * Submits an order through the authoritative PostgreSQL transaction RPC.
 */
export async function submitStorefrontOrder(
  input: SubmitOrderInput
): Promise<OrderSubmissionResult> {
  const sessionToken = await getOrCreateCartSessionToken();
  const supabase = await createClient();

  // 1. Fetch store metadata for phone normalization and store name
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, default_country_code, order_mode, whatsapp_phone, settings')
    .eq('id', input.storeId)
    .maybeSingle();

  if (storeError || !store) {
    throw new NotFoundError('المتجر غير موجود أو غير متاح');
  }

  // 2. Normalize customer phone to E.164
  let normalizedPhone = input.customerPhone.trim();
  const phoneRes = normalizePhoneNumber(normalizedPhone, store.default_country_code || 'SA');
  if (phoneRes.success) {
    normalizedPhone = phoneRes.phone;
  }

  // 3. Invoke SECURITY DEFINER submit_storefront_order RPC
  const { data, error } = await supabase.rpc('submit_storefront_order', {
    p_store_id: input.storeId,
    p_cart_id: input.cartId,
    p_session_token: sessionToken,
    p_customer_name: input.customerName.trim(),
    p_customer_phone: normalizedPhone,
    p_customer_email: input.customerEmail ? input.customerEmail.trim() : null,
    p_shipping_address: input.shippingAddress || null,
    p_customer_notes: input.customerNotes ? input.customerNotes.trim() : null,
  });

  if (error || !data) {
    if (error?.message?.includes('CART_ALREADY_CONVERTED')) {
      throw new ConflictError('تم إتمام هذا الطلب مسبقاً');
    }
    if (error?.message?.includes('INSUFFICIENT_INVENTORY')) {
      throw new ConflictError('أحد المنتجات المطلوبة نفد من المخزون');
    }
    if (error?.message?.includes('CART_IS_EMPTY')) {
      throw new ValidationError('سلة المشتريات فارغة');
    }
    logger.error('Failed to submit storefront order RPC', {
      storeId: input.storeId,
      cartId: input.cartId,
      error: error?.message,
    });
    throw new AppError('INTERNAL_ERROR', 'فشل إتمام الطلب، يرجى المحاولة مرة أخرى');
  }

  const rpcResult = data as Record<string, unknown>;
  const orderId = String(rpcResult['order_id']);
  const orderNumber = Number(rpcResult['order_number']);
  const confirmationToken = String(rpcResult['confirmation_token']);
  const orderModeUsed = rpcResult['order_mode_used'] as 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  const currency = String(rpcResult['currency']);
  const totalCents = Number(rpcResult['total_cents']);
  const whatsappPhone = rpcResult['whatsapp_phone'] ? String(rpcResult['whatsapp_phone']) : null;
  const rawLineItems = Array.isArray(rpcResult['line_items']) ? rpcResult['line_items'] : [];

  // 4. Generate WhatsApp Redirect URL strictly from canonical committed data
  let whatsappRedirectUrl: string | null = null;
  if (orderModeUsed === 'WHATSAPP' || orderModeUsed === 'BOTH') {
    const waOrderDetails: WhatsAppOrderDetails = {
      storeName: store.name,
      orderNumber,
      customerName: input.customerName.trim(),
      customerPhone: normalizedPhone,
      customerNotes: input.customerNotes || null,
      shippingAddress: input.shippingAddress || null,
      currency,
      subtotalCents: Number(rpcResult['subtotal_cents']) || 0,
      taxCents: Number(rpcResult['tax_cents']) || 0,
      shippingCents: Number(rpcResult['shipping_cents']) || 0,
      totalCents,
      lineItems: rawLineItems.map((item: Record<string, unknown>) => ({
        title: String(item['title'] || ''),
        variantTitle: String(item['variant_title'] || ''),
        quantity: Number(item['quantity']) || 1,
        unitPriceCents: Number(item['unit_price_cents']) || 0,
        totalPriceCents: Number(item['total_price_cents']) || 0,
      })),
    };

    whatsappRedirectUrl = generateWhatsAppUrl(whatsappPhone, waOrderDetails);

    if (whatsappRedirectUrl) {
      // Update order record with generated redirect URL
      await supabase
        .from('orders')
        .update({ whatsapp_redirect_url: whatsappRedirectUrl })
        .eq('id', orderId);
    }
  }

  // 5. Non-blocking Notification Dispatch (Zero Rollback on Failure)
  if (input.customerEmail && input.customerEmail.trim().length > 0) {
    void dispatchNotification({
      storeId: input.storeId,
      recipient: input.customerEmail.trim(),
      channel: 'EMAIL',
      eventType: 'CUSTOMER_ORDER_CONFIRMATION',
      payload: {
        storeId: input.storeId,
        storeName: store.name,
        orderId,
        orderNumber,
        customerName: input.customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: input.customerEmail.trim(),
        currency,
        subtotalFormatted: ((Number(rpcResult['subtotal_cents']) || 0) / 100).toFixed(2),
        deliveryFeeFormatted: ((Number(rpcResult['shipping_cents']) || 0) / 100).toFixed(2),
        taxFormatted: ((Number(rpcResult['tax_cents']) || 0) / 100).toFixed(2),
        totalFormatted: (totalCents / 100).toFixed(2),
        shippingAddressText: input.shippingAddress
          ? `${input.shippingAddress.city || ''} ${input.shippingAddress.street || ''}`.trim()
          : undefined,
        items: rawLineItems.map((item: Record<string, unknown>) => ({
          title: String(item['title'] || ''),
          variantTitle: String(item['variant_title'] || ''),
          quantity: Number(item['quantity']) || 1,
          priceFormatted: ((Number(item['unit_price_cents']) || 0) / 100).toFixed(2),
          totalFormatted: ((Number(item['total_price_cents']) || 0) / 100).toFixed(2),
        })),
        orderConfirmationUrl: `/orders/${orderId}/confirmation?token=${confirmationToken}`,
      },
    }).catch((err: unknown) => {
      logger.warn('Non-blocking customer order confirmation notification error', {
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Merchant alert notification
  void dispatchNotification({
    storeId: input.storeId,
    recipient: 'admin@souqcloud.com',
    channel: 'EMAIL',
    eventType: 'MERCHANT_NEW_ORDER_ALERT',
    payload: {
      storeId: input.storeId,
      storeName: store.name,
      merchantEmail: 'admin@souqcloud.com',
      orderId,
      orderNumber,
      customerName: input.customerName.trim(),
      customerPhone: normalizedPhone,
      customerEmail: input.customerEmail?.trim(),
      orderModeUsed,
      currency,
      totalFormatted: (totalCents / 100).toFixed(2),
      itemsSummary: rawLineItems
        .map((item: Record<string, unknown>) => String(item['title'] || ''))
        .filter(Boolean)
        .join('، ') || 'طلب جديد',
      dashboardOrderUrl: `/app/orders/${orderId}`,
    },
  }).catch((err: unknown) => {
    logger.warn('Non-blocking merchant new order alert notification error', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  logger.info('Storefront order submitted successfully', {
    storeId: input.storeId,
    orderId,
    orderNumber,
    orderModeUsed,
  });

  return {
    orderId,
    orderNumber,
    confirmationToken,
    orderModeUsed,
    currency,
    totalCents,
    whatsappRedirectUrl,
  };
}

/**
 * Retrieves order confirmation details with strict confirmation_token validation.
 * SECURITY INVARIANT: Raw orderId alone without matching token is rejected with UNAUTHORIZED.
 */
export async function getOrderConfirmation(
  orderId: string,
  confirmationToken: string
): Promise<ConfirmedOrderDetails> {
  const cleanToken = confirmationToken.trim();
  if (!cleanToken) {
    throw new UnauthorizedError('رمز التحقق الخاص بالطلب مطلوب');
  }

  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, stores(name, whatsapp_phone)')
    .eq('id', orderId)
    .eq('confirmation_token', cleanToken)
    .maybeSingle();

  if (orderError || !order) {
    throw new NotFoundError('الطلب غير موجود أو رمز التحقق غير صالح');
  }

  const { data: lines, error: linesError } = await supabase
    .from('order_line_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (linesError) {
    logger.error('Failed to fetch order line items', { orderId, error: linesError.message });
  }

  const lineItems: ConfirmedOrderLineItem[] = (lines || []).map((l) => ({
    id: l.id,
    title: l.title,
    variantTitle: l.variant_title,
    sku: l.sku,
    unitPriceCents: Number(l.unit_price_cents),
    taxCents: Number(l.tax_cents),
    quantity: Number(l.quantity),
    totalPriceCents: Number(l.total_price_cents),
  }));

  const storeInfo = (order.stores as { name: string; whatsapp_phone: string | null }) || {};

  return {
    id: order.id,
    storeId: order.store_id,
    storeName: storeInfo.name || 'المتجر',
    orderNumber: order.order_number,
    status: order.status,
    orderModeUsed: order.order_mode_used,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    shippingAddress: order.shipping_address as ConfirmedOrderDetails['shippingAddress'],
    customerNotes: order.customer_notes,
    whatsappRedirectUrl: order.whatsapp_redirect_url,
    whatsappPhone: storeInfo.whatsapp_phone || null,
    currency: order.currency,
    subtotalCents: Number(order.subtotal_cents),
    taxCents: Number(order.tax_cents),
    shippingCents: Number(order.shipping_cents),
    discountCents: Number(order.discount_cents),
    totalCents: Number(order.total_cents),
    createdAt: order.created_at,
    lineItems,
  };
}
