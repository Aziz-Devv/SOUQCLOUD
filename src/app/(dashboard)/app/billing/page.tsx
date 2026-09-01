import { redirect } from 'next/navigation';
import { getAuthenticatedSessionContext } from '@/lib/services/auth-service';
import {
  getMerchantSubscription,
  getBillingPlans,
  getMerchantInvoices,
} from '@/lib/services/billing-service';
import { BillingPlanCards } from '@/components/dashboard/billing-plan-cards';
import { SubscriptionStatus } from '@/lib/billing/types';

export const dynamic = 'force-dynamic';

const statusBadgeConfig: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  ACTIVE: {
    label: 'نشط (Active)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  TRIALING: {
    label: 'فترة تجريبية (Trial)',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  PAST_DUE: {
    label: 'متعثر في الدفع (Past Due)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  PAUSED: {
    label: 'موقف مؤقتاً (Paused)',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
  CANCELED: {
    label: 'ملغي (Canceled)',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export default async function BillingDashboardPage() {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    redirect('/login');
  }

  // Server-side role guard: STAFF members have no access to billing
  if (session.membership.role === 'STAFF') {
    redirect('/app/home');
  }

  const { merchant } = session;
  const subscription = await getMerchantSubscription(merchant.id);
  const plans = await getBillingPlans();
  const invoices = await getMerchantInvoices(merchant.id);

  const badge = statusBadgeConfig[subscription.status] || {
    label: subscription.status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">الاشتراك والفوترة</h1>
        <p className="text-sm text-text-secondary">
          إدارة باقة الاشتراك السحابي لمنشأة: <strong className="text-text-primary">{merchant.name}</strong>
        </p>
      </div>

      {/* Past Due Warning Banner */}
      {subscription.status === 'PAST_DUE' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-card flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="text-sm font-bold text-amber-900">تنبيه: تعثر تجديد الاشتراك</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              تعذر خصم رسوم تجديد الباقة الأخيرة. يرجى تحديث وسيلة الدفع خلال فترة السماح لتجنب تعليق نشر المتاجر.
            </p>
          </div>
        </div>
      )}

      {/* Active Subscription Status Card */}
      <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="space-y-1">
            <span className="text-xs text-text-muted">الباقة الحالية</span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-primary">{subscription.planTier}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {badge.label}
              </span>
            </div>
          </div>

          <div className="text-left font-mono text-xs">
            <span className="text-text-muted block">نهاية الفترة الحالية:</span>
            <span className="font-bold text-text-primary">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 bg-canvas rounded border border-border-subtle">
            <span className="text-text-muted block">عدد المتاجر المسموح:</span>
            <span className="font-bold font-mono text-sm text-text-primary">
              {subscription.planLimits?.maxStores || 1}
            </span>
          </div>
          <div className="p-3 bg-canvas rounded border border-border-subtle">
            <span className="text-text-muted block">الحد الأقصى للمنتجات:</span>
            <span className="font-bold font-mono text-sm text-text-primary">
              {subscription.planLimits?.maxProductsPerStore || 50} منتج
            </span>
          </div>
          <div className="p-3 bg-canvas rounded border border-border-subtle">
            <span className="text-text-muted block">النطاقات المخصصة:</span>
            <span className="font-bold text-sm text-text-primary">
              {subscription.planLimits?.customDomainsEnabled ? 'مفعلة' : 'غير مفعلة'}
            </span>
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
            تم جدولة إلغاء الاشتراك وسيتم إيقاف المزايا عند نهاية الفترة الحالية بتاريخ{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA')}.
          </div>
        )}
      </div>

      {/* Available Plans & Upgrades */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-primary">ترقية أو تعديل الباقة</h2>
          <p className="text-xs text-text-secondary">
            اختر الباقة المناسبة لتوسيع سعة مبيعاتك ونمو نشاطك التجاري.
          </p>
        </div>

        <BillingPlanCards
          merchantId={merchant.id}
          currentPlanTier={subscription.planTier}
          currentInterval={subscription.billingInterval}
          plans={plans}
        />
      </div>

      {/* Invoices History Table */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-base font-bold text-text-primary">سجل الفواتير والمدفوعات</h2>
          <p className="text-xs text-text-secondary">فواتير الاشتراك الصادرة عبر مزود الفوترة Paddle</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-card shadow-xs overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              لا توجد فواتير اشتراك مسجلة حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-canvas border-b border-border-subtle text-text-secondary font-semibold">
                  <tr>
                    <th className="p-3.5">رقم الفاتورة</th>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">المبلغ</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الرابط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-primary">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-background-secondary/50">
                      <td className="p-3.5 font-mono font-bold text-text-primary">
                        {inv.providerInvoiceId}
                      </td>
                      <td className="p-3.5 text-text-muted">
                        {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-3.5 font-mono font-bold">
                        ${(inv.amountCents / 100).toFixed(2)} {inv.currency}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-primary hover:underline text-xs font-semibold"
                          >
                            عرض الفاتورة ↗
                          </a>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
