import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreOrderDetail } from '@/lib/services/order-management-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { OrderStatusControls } from '@/components/dashboard/order-status-controls';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    notFound();
  }

  const activeStore = context.activeStore;
  if (!activeStore) {
    notFound();
  }

  let order;
  try {
    order = await getStoreOrderDetail(id, activeStore.id);
  } catch {
    notFound();
  }

  const subtotalFormatted = (order.subtotalCents / 100).toFixed(2);
  const deliveryFeeFormatted = (order.shippingCents / 100).toFixed(2);
  const taxFormatted = (order.taxCents / 100).toFixed(2);
  const totalFormatted = (order.totalCents / 100).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'الطلبات', href: '/app/orders' },
          { label: `#${order.orderNumber}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">
            الطلب #{order.orderNumber}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex items-center gap-3">
          <Link href="/app/orders">
            <Button variant="secondary" size="md">
              &rarr; العودة لقائمة الطلبات
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (65% width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table Card */}
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-text-primary">
              المنتجات المطلوبة ({order.lineItems.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-border-subtle text-xs text-text-secondary">
                  <tr>
                    <th className="py-2.5 px-3">المنتج</th>
                    <th className="py-2.5 px-3">الخيارات</th>
                    <th className="py-2.5 px-3">السعر</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {order.lineItems.map((item) => {
                    const itemTotal = (item.totalPriceCents / 100).toFixed(2);
                    const itemPrice = (item.unitPriceCents / 100).toFixed(2);

                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-text-primary">{item.title}</div>
                          {item.sku && (
                            <div className="text-xs font-mono text-text-muted">رمز: {item.sku}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-text-secondary">
                          {item.variantTitle || '—'}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          {itemPrice} {order.currency}
                        </td>
                        <td className="py-3 px-3 font-semibold text-text-primary">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 font-bold text-text-primary text-left">
                          {itemTotal} {order.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-border-subtle space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>المجموع الفرعي:</span>
                <span>{subtotalFormatted} {order.currency}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>رسوم التوصيل:</span>
                <span>{deliveryFeeFormatted} {order.currency}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>ضريبة القيمة المضافة:</span>
                <span>{taxFormatted} {order.currency}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-text-primary pt-2 border-t border-border-subtle">
                <span>المجموع الإجمالي:</span>
                <span className="text-brand-primary">{totalFormatted} {order.currency}</span>
              </div>
            </div>
          </Card>

          {/* Customer Delivery & Address Details */}
          <Card className="space-y-3">
            <h2 className="text-base font-bold text-text-primary">تفاصيل الشحن والتوصيل</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-text-muted block">الاسم الكامل:</span>
                <strong className="text-text-primary">{order.customerName}</strong>
              </div>
              <div>
                <span className="text-xs text-text-muted block">رقم الهاتف:</span>
                <strong className="text-text-primary font-mono" dir="ltr">{order.customerPhone}</strong>
              </div>
              {order.customerEmail && (
                <div>
                  <span className="text-xs text-text-muted block">البريد الإلكتروني:</span>
                  <span className="text-text-primary font-mono">{order.customerEmail}</span>
                </div>
              )}
              {order.shippingAddress?.city && (
                <div>
                  <span className="text-xs text-text-muted block">المدينة / المنطقة:</span>
                  <span className="text-text-primary">{order.shippingAddress.city}</span>
                </div>
              )}
              {order.shippingAddress?.street && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-text-muted block">العنوان بالتفصيل:</span>
                  <p className="text-text-primary bg-canvas p-2.5 rounded-card border border-border-subtle">
                    {order.shippingAddress.street}
                  </p>
                </div>
              )}
              {order.customerNotes && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-text-muted block">ملاحظات العميل:</span>
                  <p className="text-text-secondary italic bg-canvas p-2.5 rounded-card border border-border-subtle">
                    &ldquo;{order.customerNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Column (35% width on desktop) */}
        <div className="space-y-6">
          {/* Order Interactive Status & Actions Card */}
          <OrderStatusControls
            storeId={activeStore.id}
            orderId={order.id}
            orderNumber={order.orderNumber}
            currentStatus={order.status}
            merchantNotes={order.merchantNotes}
          />
        </div>
      </div>
    </div>
  );
}
