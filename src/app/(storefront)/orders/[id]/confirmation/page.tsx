import Link from 'next/link';
import { getOrderConfirmation } from '@/lib/services/order-submission-service';

export default async function OrderConfirmationPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id: orderId } = await props.params;
  const { token: confirmationToken } = await props.searchParams;

  if (!confirmationToken || !confirmationToken.trim()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 bg-surface border border-red-200 rounded-card shadow-card space-y-4">
          <div className="text-3xl">🔒</div>
          <h1 className="text-lg font-bold text-red-700">غير مصرح بعرض تفاصيل الطلب</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            يتطلب عرض بيانات الطلب وتأكيده استخدام الرابط المخصص مع رمز التحقق السري الخاص بك.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-btn"
            >
              العودة للمتجر
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let order;
  try {
    order = await getOrderConfirmation(orderId, confirmationToken);
  } catch {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 bg-surface border border-border-subtle rounded-card shadow-card space-y-4">
          <div className="text-3xl">🔍</div>
          <h1 className="text-lg font-bold text-text-primary">الطلب غير موجود</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            تعذر العثور على بيانات هذا الطلب، أو أن رمز التحقق غير مطابق.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-btn"
            >
              العودة للمتجر
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatMoney = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
      {/* Success Banner */}
      <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-card text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
          ✓
        </div>
        <h1 className="text-2xl font-black text-emerald-900 tracking-tight">
          تم استلام طلبك بنجاح!
        </h1>
        <p className="text-xs text-emerald-700 max-w-md mx-auto">
          شكراً لتسوقك من متجر <span className="font-bold">{order.storeName}</span>. تم تسجيل طلبك
          في النظام وسيتم التواصل معك لتأكيد التجهيز والتوصيل.
        </p>
        <div className="pt-2">
          <span className="inline-block px-3 py-1 bg-white border border-emerald-300 rounded-full font-mono text-xs font-bold text-emerald-800">
            رقم الطلب: #{order.orderNumber}
          </span>
        </div>
      </div>

      {/* WhatsApp Outcome Call-To-Action (if WHATSAPP or BOTH mode) */}
      {(order.orderModeUsed === 'WHATSAPP' || order.orderModeUsed === 'BOTH') && (
        <div className="p-6 bg-green-50 border border-green-300 rounded-card text-center space-y-3">
          <div className="text-2xl">💬</div>
          <h2 className="text-sm font-bold text-green-900">
            إتمام ومتابعة الطلب عبر واتساب
          </h2>
          <p className="text-xs text-green-700 max-w-lg mx-auto">
            اضغط على الزر أدناه لإرسال ملخص الطلب مباشرة إلى محادثة المتجر عبر تطبيق واتساب لمتابعة
            حالة الطلب بشكل فوري.
          </p>
          {order.whatsappRedirectUrl ? (
            <div className="pt-2">
              <a
                href={order.whatsappRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm rounded-btn shadow-md transition-all"
              >
                <span>متابعة الطلب عبر واتساب</span>
                <span>💬</span>
              </a>
            </div>
          ) : (
            <div className="text-xs text-text-muted">
              رقم واتساب المتجر غير مهيأ حالياً. سيتواصل معك فريق المتجر قريباً.
            </div>
          )}
        </div>
      )}

      {/* Order Receipt Details */}
      <div className="p-6 sm:p-8 bg-surface border border-border-subtle rounded-card shadow-card space-y-6">
        <div className="border-b border-border-subtle pb-4 flex items-center justify-between">
          <h3 className="font-bold text-sm text-text-primary">تفاصيل الفاتورة</h3>
          <span className="text-xs text-text-muted">
            {new Date(order.createdAt).toLocaleDateString('ar-SA')}
          </span>
        </div>

        {/* Customer & Address Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-text-muted block">اسم العميل:</span>
            <span className="font-semibold text-text-primary block">{order.customerName}</span>
            <span className="font-mono text-text-secondary block" dir="ltr">
              {order.customerPhone}
            </span>
          </div>

          {order.shippingAddress && (
            <div className="space-y-1">
              <span className="text-text-muted block">عنوان التوصيل:</span>
              <span className="text-text-primary block">
                {[
                  order.shippingAddress.street,
                  order.shippingAddress.city,
                  order.shippingAddress.country,
                ]
                  .filter(Boolean)
                  .join('، ')}
              </span>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <h4 className="text-xs font-bold text-text-primary">المنتجات المطلوبة</h4>
          <div className="space-y-2">
            {order.lineItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-2 border-b border-border-subtle/50"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="font-bold text-text-primary block truncate">
                    {item.title}
                  </span>
                  {item.variantTitle && (
                    <span className="text-[11px] text-text-muted block">
                      {item.variantTitle}
                    </span>
                  )}
                </div>
                <div className="text-left font-mono font-bold text-text-primary flex-shrink-0">
                  {item.quantity} × {formatMoney(item.unitPriceCents)} ={' '}
                  {formatMoney(item.totalPriceCents)} {order.currency}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-t border-border-subtle pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>المجموع الفرعي:</span>
            <span className="font-mono">{formatMoney(order.subtotalCents)} {order.currency}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>تكلفة الشحن:</span>
            <span className="font-mono">{formatMoney(order.shippingCents)} {order.currency}</span>
          </div>
          {order.taxCents > 0 && (
            <div className="flex justify-between text-text-secondary">
              <span>الضريبة:</span>
              <span className="font-mono">{formatMoney(order.taxCents)} {order.currency}</span>
            </div>
          )}
          <div className="border-t border-border-subtle pt-3 flex justify-between items-baseline text-base font-bold text-text-primary">
            <span>الإجمالي النهائي:</span>
            <span className="font-mono text-xl text-brand-primary">
              {formatMoney(order.totalCents)} {order.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Return to Store */}
      <div className="text-center pt-4">
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-surface border border-border-subtle hover:border-border-strong text-xs font-semibold rounded-btn text-text-primary transition-colors"
        >
          العودة للمتجر الرئيسي
        </Link>
      </div>
    </div>
  );
}
