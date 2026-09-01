/**
 * WhatsApp Order Message Compiler
 * Source of Truth: docs/03-modules/checkout.md & ADR-005
 * 
 * Invariant: WhatsApp text is compiled strictly server-side from committed PostgreSQL records.
 */

export interface WhatsAppOrderDetails {
  storeName: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerNotes?: string | null;
  shippingAddress?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  lineItems: Array<{
    title: string;
    variantTitle: string;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
  }>;
}

/**
 * Compiles a structured, professional Arabic order summary for WhatsApp redirection.
 */
export function compileWhatsAppOrderMessage(order: WhatsAppOrderDetails): string {
  const formatMoney = (cents: number) => (cents / 100).toFixed(2);

  const linesText = order.lineItems
    .map(
      (item, i) =>
        `${i + 1}. *${item.title}* (${item.variantTitle})\n   الكمية: ${item.quantity} × ${formatMoney(item.unitPriceCents)} ${order.currency} = *${formatMoney(item.totalPriceCents)} ${order.currency}*`
    )
    .join('\n\n');

  let addressText = '';
  if (order.shippingAddress) {
    const parts = [
      order.shippingAddress.street,
      order.shippingAddress.city,
      order.shippingAddress.country,
    ].filter(Boolean);
    if (parts.length > 0) {
      addressText = `\n📍 *عنوان التوصيل:* ${parts.join('، ')}`;
    }
  }

  let notesText = '';
  if (order.customerNotes && order.customerNotes.trim()) {
    notesText = `\n📝 *ملاحظات الطلب:* ${order.customerNotes.trim()}`;
  }

  const message = `🛍️ *طلب جديد من متجر ${order.storeName}*
-----------------------------
🔢 *رقم الطلب:* #${order.orderNumber}
👤 *اسم العميل:* ${order.customerName}
📞 *رقم الهاتف:* ${order.customerPhone}${addressText}${notesText}

📦 *المنتجات المطلوبة:*
${linesText}
-----------------------------
💵 *المجموع الفرعي:* ${formatMoney(order.subtotalCents)} ${order.currency}
🚚 *الشحن:* ${formatMoney(order.shippingCents)} ${order.currency}
${order.taxCents > 0 ? `🏛️ *الضريبة:* ${formatMoney(order.taxCents)} ${order.currency}\n` : ''}💰 *الإجمالي النهائي:* *${formatMoney(order.totalCents)} ${order.currency}*
-----------------------------
شكراً لطلبكم! يسعدنا خدمتكم.`;

  return message;
}

/**
 * Generates the full WhatsApp URL with encoded message.
 */
export function generateWhatsAppUrl(
  whatsappPhone: string | null | undefined,
  order: WhatsAppOrderDetails
): string | null {
  if (!whatsappPhone) {
    return null;
  }

  // Clean phone: strip any non-digit characters except leading +
  const cleanPhone = whatsappPhone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!cleanPhone) {
    return null;
  }

  const message = compileWhatsAppOrderMessage(order);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
