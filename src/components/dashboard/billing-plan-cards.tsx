'use client';

import { useState } from 'react';
import { BillingPlan, BillingInterval, PlanTier } from '@/lib/billing/types';
import { createBillingCheckoutAction } from '@/app/actions/billing';

interface BillingPlanCardsProps {
  merchantId: string;
  currentPlanTier: string;
  currentInterval: BillingInterval;
  plans: BillingPlan[];
}

export function BillingPlanCards({
  merchantId,
  currentPlanTier,
  currentInterval: initialInterval,
  plans,
}: BillingPlanCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval || 'MONTHLY');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectPlan = async (tier: PlanTier) => {
    if (tier === currentPlanTier && interval === initialInterval) return;

    setLoadingTier(tier);
    setErrorMessage(null);

    try {
      const res = await createBillingCheckoutAction({
        merchantId,
        planTier: tier,
        billingInterval: interval,
      });

      if (res.success && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else if (!res.success) {
        setErrorMessage(res.error.message || 'فشل إنشاء جلسة الدفع');
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع أثناء الاتصال بنظام الفوترة');
    } finally {
      setLoadingTier(null);
    }
  };

  const formatPrice = (cents: number) => {
    const dollars = cents / 100;
    return `$${dollars.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Interval Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={`text-xs font-semibold cursor-pointer ${
            interval === 'MONTHLY' ? 'text-brand-primary font-bold' : 'text-text-secondary'
          }`}
          onClick={() => setInterval('MONTHLY')}
        >
          الدفع شهرياً
        </span>

        <button
          type="button"
          onClick={() => setInterval(interval === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
          className="w-12 h-6 bg-slate-200 rounded-full p-1 transition-colors relative focus:outline-none"
        >
          <div
            className={`w-4 h-4 bg-brand-primary rounded-full transition-transform ${
              interval === 'YEARLY' ? '-translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>

        <span
          className={`text-xs font-semibold cursor-pointer flex items-center gap-1 ${
            interval === 'YEARLY' ? 'text-brand-primary font-bold' : 'text-text-secondary'
          }`}
          onClick={() => setInterval('YEARLY')}
        >
          <span>الدفع سنوياً</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
            خصم شهرين
          </span>
        </span>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanTier;
          const priceCents =
            interval === 'MONTHLY' ? plan.monthlyPriceCents : plan.yearlyPriceCents;
          const isLoading = loadingTier === plan.code;

          return (
            <div
              key={plan.id}
              className={`p-6 bg-surface border rounded-card shadow-xs flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-brand-primary ring-2 ring-brand-primary/20 relative'
                  : 'border-border-subtle hover:border-border-strong'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 right-6 px-2.5 py-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full shadow-xs">
                  باقتك الحالية
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-text-primary">
                      {formatPrice(priceCents)}
                    </span>
                    <span className="text-xs text-text-muted">
                      / {interval === 'MONTHLY' ? 'شهرياً' : 'سنوياً'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-text-secondary border-t border-border-subtle pt-4">
                  <li className="flex items-center gap-2">
                    <span className="text-brand-primary">✓</span>
                    <span>
                      {plan.maxStores === 1
                        ? 'متجر إلكتروني واحد'
                        : plan.maxStores > 10
                        ? 'متاجر غير محدودة'
                        : `حتى ${plan.maxStores} متاجر`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-brand-primary">✓</span>
                    <span>
                      {plan.maxProductsPerStore >= 10000
                        ? 'منتجات غير محدودة'
                        : `حتى ${plan.maxProductsPerStore} منتج في المتجر`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-brand-primary">✓</span>
                    <span>استقبال الطلبات عبر لوحة التحكم وواتساب</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={plan.customDomainsEnabled ? 'text-brand-primary' : 'text-slate-300'}>
                      {plan.customDomainsEnabled ? '✓' : '✗'}
                    </span>
                    <span className={plan.customDomainsEnabled ? '' : 'text-text-muted line-through'}>
                      ربط النطاقات المخصصة (Custom Domains)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={isCurrent || isLoading}
                  onClick={() => handleSelectPlan(plan.code as PlanTier)}
                  className={`w-full py-2.5 px-4 rounded-btn text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                      : 'bg-brand-primary hover:bg-brand-hover text-white shadow-xs'
                  }`}
                >
                  {isLoading ? 'جاري التحويل...' : isCurrent ? 'باقتك المفعلة' : 'ترقية / اختيار الباقة'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
