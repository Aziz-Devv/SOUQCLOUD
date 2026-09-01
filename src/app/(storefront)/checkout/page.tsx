'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/storefront/cart-provider';
import { submitOrderAction } from '@/app/actions/order-submission';
import { calculateOrderTotals } from '@/lib/checkout/calculations';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, refreshCart } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('SA');
  const [customerNotes, setCustomerNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lines = cart?.lines || [];
  const currency = cart?.currency || 'SAR';

  // Preview totals calculation
  const totals = calculateOrderTotals(
    lines.map((l) => ({ unitPriceCents: l.priceCents, quantity: l.quantity })),
    { flatRateCents: 0, freeShippingThresholdCents: null },
    0,
    false
  );

  const formatMoney = (cents: number) => (cents / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || lines.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('يرجى ملء جميع الحقول الإلزامية (الاسم ورقم الهاتف)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitOrderAction({
        storeId: cart.storeId,
        cartId: cart.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        shippingAddress: street.trim()
          ? {
              street: street.trim(),
              city: city.trim() || 'الرياض',
              country: country.trim() || 'SA',
            }
          : undefined,
        customerNotes: customerNotes.trim() || undefined,
      });

      if (res.success) {
        await refreshCart();
        router.push(
          `/orders/${res.data.orderId}/confirmation?token=${res.data.confirmationToken}`
        );
      } else {
        setErrorMessage(res.error.message || 'فشل إتمام الطلب، يرجى المحاولة مرة أخرى');
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع أثناء إتمام الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart && isCartLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-text-secondary text-sm">جاري تحميل بيانات السلة...</div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">🛒</div>
        <h1 className="text-xl font-bold text-text-primary">سلة المشتريات فارغة</h1>
        <p className="text-xs text-text-secondary">
          لا توجد منتجات في سلتك حالياً لإتمام الطلب.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-btn shadow-xs"
          >
            العودة للتسوق
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Checkout Header */}
      <div className="mb-8 border-b border-border-subtle pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            إتمام الطلب
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            أدخل بيانات التواصل وعنوان التوصيل لتأكيد طلبك مباشرة.
          </p>
        </div>
        <Link href="/" className="text-xs text-brand-primary hover:underline">
          ← العودة للمتجر
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-card text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Main Column: Customer Information & Delivery */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contact Details Card */}
          <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>👤</span> بيانات العميل
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  رقم الهاتف (واتساب) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0501234567"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary text-right focus:outline-none focus:border-brand-primary font-mono"
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  يستخدم لتأكيد الطلب وإرسال تفاصيل التوصيل عبر واتساب.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ahmed@example.com"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary text-right focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>📍</span> عنوان التوصيل
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  العنوان التفصيلي / الشارع
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="اسم الحي، الشارع، رقم المبنى"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="الرياض"
                    className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    الدولة
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    <option value="SA">المملكة العربية السعودية (SA)</option>
                    <option value="AE">الإمارات العربية المتحدة (AE)</option>
                    <option value="KW">الكويت (KW)</option>
                    <option value="BH">البحرين (BH)</option>
                    <option value="OM">عمان (OM)</option>
                    <option value="QA">قطر (QA)</option>
                    <option value="EG">مصر (EG)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Order Notes */}
          <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>📝</span> ملاحظات خاصة بالطلب
            </h2>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="أي تعليمات خاصة بالتوصيل أو تجهيز الطلب..."
              className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>
        </div>

        {/* Right Column: Order Summary & Primary CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-card space-y-6 sticky top-24">
            <h2 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3">
              ملخص الطلب ({cart?.itemCount || 0} منتجات)
            </h2>

            {/* Line Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div key={line.id} className="flex gap-3 items-center text-xs">
                  <div className="w-12 h-12 bg-slate-100 rounded-sm border border-border-subtle overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {line.images.length > 0 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={line.images[0]}
                        alt={line.productTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400">صورة</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary truncate">{line.productTitle}</p>
                    <p className="text-text-muted text-[11px]">
                      الكمية: {line.quantity} × {formatMoney(line.priceCents)} {currency}
                    </p>
                  </div>
                  <div className="font-mono font-bold text-text-primary">
                    {formatMoney(line.priceCents * line.quantity)} {currency}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-border-subtle pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>المجموع الفرعي</span>
                <span className="font-mono">{formatMoney(totals.subtotalCents)} {currency}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>الشحن والتوصيل</span>
                <span className="font-mono">يحدد عند التأكيد</span>
              </div>
              <div className="border-t border-border-subtle pt-3 flex justify-between items-baseline text-sm font-bold text-text-primary">
                <span>الإجمالي التقديري</span>
                <span className="font-mono text-lg text-brand-primary">
                  {formatMoney(totals.totalCents)} {currency}
                </span>
              </div>
            </div>

            {/* Primary Order Submission Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || lines.length === 0}
                className="w-full py-3.5 px-6 bg-brand-primary hover:bg-brand-hover text-white text-center font-bold text-sm rounded-btn shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري إتمام الطلب...' : 'إتمام الطلب'}
              </button>
              <p className="text-[11px] text-text-muted text-center mt-2">
                بالضغط على &quot;إتمام الطلب&quot; يتم تأكيد طلبك وإرساله للمتجر مباشرة.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
