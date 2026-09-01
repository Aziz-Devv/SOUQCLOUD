import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/errors';
import { getAuthenticatedSessionContext } from './auth-service';
import {
  OrderFilterInput,
  OrderStatus,
} from '@/lib/schemas/order-management';
import { dispatchNotification } from './notification-service';

export interface OrderListItem {
  id: string;
  storeId: string;
  orderNumber: number;
  status: OrderStatus;
  orderModeUsed: 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  customerName: string;
  customerPhone: string;
  currency: string;
  totalCents: number;
  itemsCount: number;
  itemsSummary: string;
  createdAt: string;
}

export interface OrderStatusCounts {
  all: number;
  new: number;
  contacted: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

export interface OrdersListResponse {
  orders: OrderListItem[];
  counts: OrderStatusCounts;
  total: number;
  page: number;
  limit: number;
}

export interface MerchantOrderDetail {
  id: string;
  storeId: string;
  orderNumber: number;
  confirmationToken: string;
  status: OrderStatus;
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
  merchantNotes: string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  whatsappContactUrl: string;
  lineItems: Array<{
    id: string;
    productId: string | null;
    variantId: string | null;
    title: string;
    variantTitle: string;
    sku: string | null;
    unitPriceCents: number;
    taxCents: number;
    quantity: number;
    totalPriceCents: number;
  }>;
}

/**
 * Validates that the authenticated caller has access to the target store.
 */
async function verifyCallerStoreAccess(storeId: string) {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    throw new ForbiddenError('يجب تسجيل الدخول للوصول إلى بيانات المتجر');
  }

  const supabase = await createClient();
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .maybeSingle();

  if (error || !store) {
    throw new ForbiddenError('غير مصرح لك بإدارة هذا المتجر');
  }

  return { session, storeName: store.name };
}

/**
 * Lists store orders with status filtering, search, and status counters.
 */
export async function getStoreOrders(
  storeId: string,
  filters?: Partial<OrderFilterInput>
): Promise<OrdersListResponse> {
  await verifyCallerStoreAccess(storeId);
  const supabase = await createClient();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. Base Query for paginated orders
  let query = supabase
    .from('orders')
    .select('id, store_id, order_number, status, order_mode_used, customer_name, customer_phone, currency, total_cents, created_at', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();
    // Search order_number (if numeric), customer_name, or customer_phone
    if (/^\d+$/.test(q.replace('#', ''))) {
      const num = parseInt(q.replace('#', ''), 10);
      query = query.or(`order_number.eq.${num},customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
    } else {
      query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
    }
  }

  query = query.range(from, to);

  const { data: ordersData, count, error } = await query;
  if (error) {
    logger.error('Failed to fetch store orders', { storeId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل قائمة الطلبات');
  }

  // 2. Fetch line items for summary in list view
  const orderIds = (ordersData || []).map((o) => o.id);
  const linesMap = new Map<string, { count: number; summary: string }>();

  if (orderIds.length > 0) {
    const { data: lines } = await supabase
      .from('order_line_items')
      .select('order_id, title, quantity')
      .in('order_id', orderIds);

    (lines || []).forEach((line) => {
      const existing = linesMap.get(line.order_id) || { count: 0, summary: '' };
      existing.count += line.quantity;
      if (!existing.summary) {
        existing.summary = `${line.title} (×${line.quantity})`;
      } else if (existing.summary.split(', ').length < 2) {
        existing.summary += `, ${line.title} (×${line.quantity})`;
      }
      linesMap.set(line.order_id, existing);
    });
  }

  const orders: OrderListItem[] = (ordersData || []).map((o) => {
    const lineInfo = linesMap.get(o.id) || { count: 0, summary: 'منتجات الطلب' };
    return {
      id: o.id,
      storeId: o.store_id,
      orderNumber: o.order_number,
      status: o.status as OrderStatus,
      orderModeUsed: o.order_mode_used,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      currency: o.currency,
      totalCents: Number(o.total_cents),
      itemsCount: lineInfo.count,
      itemsSummary: lineInfo.summary,
      createdAt: o.created_at,
    };
  });

  // 3. Fetch status counts for tab badges
  const { data: countsData } = await supabase
    .from('orders')
    .select('status')
    .eq('store_id', storeId);

  const counts: OrderStatusCounts = {
    all: countsData?.length || 0,
    new: 0,
    contacted: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  };

  (countsData || []).forEach((row) => {
    const s = row.status?.toLowerCase() as keyof OrderStatusCounts;
    if (s && typeof counts[s] === 'number') {
      counts[s] += 1;
    }
  });

  return {
    orders,
    counts,
    total: count || 0,
    page,
    limit,
  };
}

/**
 * Retrieves full merchant order details, line items, and WhatsApp action link.
 */
export async function getStoreOrderDetail(
  storeId: string,
  orderId: string
): Promise<MerchantOrderDetail> {
  const { storeName } = await verifyCallerStoreAccess(storeId);
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (orderError || !order) {
    throw new NotFoundError('الطلب غير موجود أو غير متاح');
  }

  const { data: lineItemsData, error: linesError } = await supabase
    .from('order_line_items')
    .select('*')
    .eq('order_id', orderId)
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (linesError) {
    logger.error('Failed to fetch order line items', { orderId, error: linesError.message });
  }

  const lineItems = (lineItemsData || []).map((l) => ({
    id: l.id,
    productId: l.product_id,
    variantId: l.variant_id,
    title: l.title,
    variantTitle: l.variant_title,
    sku: l.sku,
    unitPriceCents: Number(l.unit_price_cents),
    taxCents: Number(l.tax_cents),
    quantity: Number(l.quantity),
    totalPriceCents: Number(l.total_price_cents),
  }));

  // Build merchant-to-customer WhatsApp contact URL
  const cleanPhone = (order.customer_phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  const greeting = `مرحباً ${order.customer_name}، نتواصل معك بخصوص طلبك رقم #${order.order_number} من متجر ${storeName}.`;
  const whatsappContactUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`
    : '';

  return {
    id: order.id,
    storeId: order.store_id,
    orderNumber: order.order_number,
    confirmationToken: order.confirmation_token,
    status: order.status as OrderStatus,
    orderModeUsed: order.order_mode_used,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    shippingAddress: order.shipping_address,
    customerNotes: order.customer_notes,
    merchantNotes: order.merchant_notes,
    currency: order.currency,
    subtotalCents: Number(order.subtotal_cents),
    taxCents: Number(order.tax_cents),
    shippingCents: Number(order.shipping_cents),
    discountCents: Number(order.discount_cents),
    totalCents: Number(order.total_cents),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    whatsappContactUrl,
    lineItems,
  };
}

/**
 * Updates order status using the server-authoritative state machine RPC.
 */
export async function updateOrderStatus(
  storeId: string,
  orderId: string,
  newStatus: OrderStatus,
  merchantNotes?: string
): Promise<void> {
  await verifyCallerStoreAccess(storeId);
  const supabase = await createClient();

  // Retrieve existing order to check previousStatus and customer email
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('status, customer_name, customer_email, order_number, currency, total_cents, stores(name)')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .maybeSingle();

  const previousStatus = existingOrder?.status;

  const { error } = await supabase.rpc('update_merchant_order_status', {
    p_store_id: storeId,
    p_order_id: orderId,
    p_new_status: newStatus,
    p_merchant_notes: merchantNotes || null,
  });

  if (error) {
    if (error.message.includes('INVALID_STATUS_TRANSITION')) {
      throw new ConflictError(`لا يمكن تغيير حالة الطلب إلى ${newStatus}`);
    }
    if (error.message.includes('TERMINAL_STATUS_IMMUTABLE')) {
      throw new ConflictError('لا يمكن تعديل حالة طلب مكتمل أو ملغي');
    }
    logger.error('Failed to update order status RPC', { storeId, orderId, newStatus, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحديث حالة الطلب');
  }

  // Non-blocking CUSTOMER_ORDER_FULFILLED dispatch ONLY on genuine transition into READY or DELIVERED
  if (
    (newStatus === 'READY' || newStatus === 'DELIVERED') &&
    previousStatus !== newStatus &&
    existingOrder?.customer_email &&
    existingOrder.customer_email.trim().length > 0
  ) {
    const storeName =
      (existingOrder.stores as { name?: string } | null)?.name || 'المتجر';

    void dispatchNotification({
      storeId,
      recipient: existingOrder.customer_email.trim(),
      channel: 'EMAIL',
      eventType: 'CUSTOMER_ORDER_FULFILLED',
      payload: {
        storeId,
        storeName,
        orderId,
        orderNumber: existingOrder.order_number,
        customerName: existingOrder.customer_name,
        customerEmail: existingOrder.customer_email.trim(),
        fulfillmentStatus: newStatus,
        fulfillmentNotes: merchantNotes || undefined,
        currency: existingOrder.currency,
        totalFormatted: (Number(existingOrder.total_cents) / 100).toFixed(2),
      },
    }).catch((err: unknown) => {
      logger.warn('Non-blocking fulfillment notification error', {
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  logger.info('Merchant updated order status', { storeId, orderId, newStatus });
}

/**
 * Cancels an order with atomic inventory restocking and double-restock protection.
 */
export async function cancelOrder(
  storeId: string,
  orderId: string,
  reason: string,
  restockInventory: boolean
): Promise<void> {
  await verifyCallerStoreAccess(storeId);
  const supabase = await createClient();

  const { error } = await supabase.rpc('cancel_merchant_order', {
    p_store_id: storeId,
    p_order_id: orderId,
    p_reason: reason.trim(),
    p_restock_inventory: restockInventory,
  });

  if (error) {
    if (error.message.includes('ORDER_ALREADY_CANCELLED')) {
      throw new ConflictError('الطلب ملغي مسبقاً');
    }
    if (error.message.includes('CANNOT_CANCEL_DELIVERED_ORDER')) {
      throw new ConflictError('لا يمكن إلغاء طلب تم توصيله بنجاح');
    }
    logger.error('Failed to cancel merchant order RPC', { storeId, orderId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل إلغاء الطلب');
  }

  logger.info('Merchant cancelled order', { storeId, orderId, restockInventory });
}

/**
 * Updates merchant internal notes for an order.
 */
export async function updateOrderNotes(
  storeId: string,
  orderId: string,
  merchantNotes: string
): Promise<void> {
  await verifyCallerStoreAccess(storeId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({ merchant_notes: merchantNotes.trim(), updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('store_id', storeId);

  if (error) {
    logger.error('Failed to update order merchant notes', { storeId, orderId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل حفظ ملاحظات التاجر');
  }
}
