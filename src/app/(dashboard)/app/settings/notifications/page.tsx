import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreNotifications } from '@/lib/services/notification-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  renderCustomerOrderConfirmationEmail,
  renderMerchantNewOrderAlertEmail,
  renderCustomerOrderFulfilledEmail,
} from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export default async function NotificationsSettingsPage(props: {
  searchParams: Promise<{ preview?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إعدادات الإشعارات</h1>
          <p className="text-sm text-text-secondary">إدارة قوالب البريد الإلكتروني وسجل الإرسال</p>
        </div>

        <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            يجب إنشاء متجر أولاً
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            قم بإنشاء وتأسيس متجرك الأول لتتمكن من إدارة إشعارات الطلبات وقوالب البريد الإلكتروني.
          </p>
          <Link href="/app/onboarding/store">
            <Button variant="primary" size="lg">
              إنشاء متجرك الأول الآن
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Server-side role guard: STAFF members have no access to notification settings
  if (context.membership.role === 'STAFF') {
    redirect('/app/home');
  }

  const activeStore = context.activeStore;
  if (!activeStore) {
    return null;
  }

  const selectedPreview = searchParams.preview || 'CUSTOMER_ORDER_CONFIRMATION';
  const filterStatus = (searchParams.status as 'PENDING' | 'SENT' | 'FAILED' | 'ALL') || 'ALL';

  const { notifications, total } = await getStoreNotifications(activeStore.id, {
    status: filterStatus,
    limit: 20,
  });

  // Generate dynamic sample email preview based on selection
  let sampleRender: { subject: string; html: string; text: string };

  switch (selectedPreview) {
    case 'MERCHANT_NEW_ORDER_ALERT':
      sampleRender = renderMerchantNewOrderAlertEmail({
        storeId: activeStore.id,
        storeName: activeStore.name,
        merchantEmail: context.user.email,
        orderId: 'sample-order-uuid',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerPhone: '+966501234567',
        customerEmail: 'sara@example.com',
        orderModeUsed: 'DASHBOARD',
        currency: activeStore.currency,
        totalFormatted: '250.00',
        itemsSummary: 'عباية كلاسيكية + طرحة مطرزة',
        dashboardOrderUrl: 'https://souqcloud.com/app/orders/sample',
      });
      break;

    case 'CUSTOMER_ORDER_FULFILLED':
      sampleRender = renderCustomerOrderFulfilledEmail({
        storeId: activeStore.id,
        storeName: activeStore.name,
        orderId: 'sample-order-uuid',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerEmail: 'sara@example.com',
        fulfillmentStatus: 'READY',
        fulfillmentNotes: 'طلبك مغلف وجاهز للتسليم مع المندوب.',
        currency: activeStore.currency,
        totalFormatted: '250.00',
      });
      break;

    case 'CUSTOMER_ORDER_CONFIRMATION':
    default:
      sampleRender = renderCustomerOrderConfirmationEmail({
        storeId: activeStore.id,
        storeName: activeStore.name,
        orderId: 'sample-order-uuid',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerPhone: '+966501234567',
        customerEmail: 'sara@example.com',
        currency: activeStore.currency,
        subtotalFormatted: '220.00',
        deliveryFeeFormatted: '30.00',
        taxFormatted: '32.61',
        totalFormatted: '250.00',
        shippingAddressText: 'الرياض، حي النرجس، شارع أنس بن مالك',
        items: [
          {
            title: 'عباية كلاسيكية سوداء فاخرة',
            variantTitle: 'مقاس 54 / قماش صالونة',
            quantity: 1,
            priceFormatted: '200.00',
            totalFormatted: '200.00',
          },
          {
            title: 'طرحة مطرزة باليد',
            quantity: 1,
            priceFormatted: '20.00',
            totalFormatted: '20.00',
          },
        ],
      });
      break;
  }

  const templateOptions = [
    {
      id: 'CUSTOMER_ORDER_CONFIRMATION',
      name: 'تأكيد استلام الطلب (للعميل)',
      description: 'يتم إرسال هذا البريد تلقائياً للعميل عند إتمام الطلب بنجاح متضمناً تفاصيل الفاتورة.',
      event: 'CUSTOMER_ORDER_CONFIRMATION',
    },
    {
      id: 'MERCHANT_NEW_ORDER_ALERT',
      name: 'تنبيه طلب جديد (للتاجر)',
      description: 'يتم إرسال تنبيه فوري لبريد التاجر عند ورود طلب جديد للمتجر.',
      event: 'MERCHANT_NEW_ORDER_ALERT',
    },
    {
      id: 'CUSTOMER_ORDER_FULFILLED',
      name: 'تحديث حالة التنفيذ والشحن (للعميل)',
      description: 'يتم إرسال هذا البريد عند تحديث حالة الطلب إلى جاهز (READY) أو تم التوصيل (DELIVERED).',
      event: 'CUSTOMER_ORDER_FULFILLED',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'الرئيسية', href: '/app/home' },
          { label: 'الإشعارات وقوالب البريد' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إعدادات الإشعارات وقوالب البريد</h1>
          <p className="text-sm text-text-secondary">
            معاينة قوالب البريد الإلكتروني وسجل الإرسال لمتجر: <strong className="text-text-primary">{activeStore.name}</strong>
          </p>
        </div>
      </div>

      {/* Template Selection & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-text-primary">قوالب الرسائل المعتمدة</h2>

          {templateOptions.map((t) => {
            const isSelected = selectedPreview === t.id;
            return (
              <Link
                key={t.id}
                href={`/app/settings/notifications?preview=${t.id}`}
                className="block"
              >
                <Card
                  className={`p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-brand-primary bg-surface shadow-sm'
                      : 'hover:border-border-strong bg-canvas'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary">{t.name}</h3>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-primary text-white">
                        المعروض حالياً
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    {t.description}
                  </p>
                  <div className="text-[11px] font-mono text-text-muted mt-2">
                    الحدث: {t.event}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Right Column: HTML Template Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">معاينة البريد الإلكتروني</h2>
            <span className="text-xs text-text-secondary">العنوان: {sampleRender.subject}</span>
          </div>

          <Card className="p-0 overflow-hidden border border-border-subtle bg-white shadow-card">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-border-subtle flex items-center justify-between text-xs text-slate-600">
              <span><strong>الموضوع:</strong> {sampleRender.subject}</span>
              <span className="text-[11px] bg-slate-200 px-2 py-0.5 rounded">معاينة تفاعلية</span>
            </div>
            <div className="p-4 overflow-auto max-h-[500px]">
              <iframe
                title="Email Preview"
                srcDoc={sampleRender.html}
                className="w-full h-[420px] border-0 rounded"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Notification Delivery Logs Table */}
      <div className="space-y-4 pt-6 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">سجل إرسال الإشعارات</h2>
            <p className="text-xs text-text-secondary">
              سجل تفصيلي لجميع الرسائل المرسلة لمتجر {activeStore.name} ({total} سجل)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app/settings/notifications?status=ALL"
              className={`px-3 py-1 text-xs rounded-full ${
                filterStatus === 'ALL'
                  ? 'bg-brand-primary text-white font-bold'
                  : 'bg-surface text-text-secondary border border-border-subtle'
              }`}
            >
              الكل
            </Link>
            <Link
              href="/app/settings/notifications?status=SENT"
              className={`px-3 py-1 text-xs rounded-full ${
                filterStatus === 'SENT'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-surface text-text-secondary border border-border-subtle'
              }`}
            >
              ناجح (SENT)
            </Link>
            <Link
              href="/app/settings/notifications?status=FAILED"
              className={`px-3 py-1 text-xs rounded-full ${
                filterStatus === 'FAILED'
                  ? 'bg-feedback-danger text-white font-bold'
                  : 'bg-surface text-text-secondary border border-border-subtle'
              }`}
            >
              فشل (FAILED)
            </Link>
          </div>
        </div>

        {notifications.length === 0 ? (
          <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
            <p className="text-sm text-text-secondary">
              لا توجد سجلات إشعارات مطابقة لهذا المتجر بعد.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface shadow-card">
            <table className="w-full text-right text-sm">
              <thead className="bg-canvas border-b border-border-subtle text-text-secondary text-xs uppercase">
                <tr>
                  <th className="py-3 px-4">نوع الإشعار</th>
                  <th className="py-3 px-4">المستلم</th>
                  <th className="py-3 px-4">القناة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ الإرسال</th>
                  <th className="py-3 px-4">ملاحظات / أخطاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-background-secondary transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {n.eventType}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-text-secondary" dir="ltr">
                      {n.recipient}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {n.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          n.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : n.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary">
                      {new Date(n.createdAt).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted max-w-[200px] truncate">
                      {n.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
