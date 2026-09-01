import Link from 'next/link';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreOrders } from '@/lib/services/order-management-service';
import { OrderStatus } from '@/lib/schemas/order-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';

export const dynamic = 'force-dynamic';

export default async function OrdersListPage(props: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">الطلبات</h1>
          <p className="text-sm text-text-secondary">إدارة ومتابعة طلبات المتجر</p>
        </div>

        <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            يجب إنشاء متجر أولاً لمتابعة الطلبات
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            قم بإنشاء وتأسيس متجرك الأول ونشره للبدء في استقبال طلبات العملاء عبر المتجر وواتساب.
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

  const activeStore = context.activeStore;
  if (!activeStore) return null;

  const currentStatusParam = searchParams.status?.toUpperCase();
  const currentStatus: OrderStatus | undefined =
    currentStatusParam && currentStatusParam !== 'ALL'
      ? (currentStatusParam as OrderStatus)
      : undefined;

  const currentSearch = searchParams.search || '';
  const currentPage = parseInt(searchParams.page || '1', 10);

  const { orders, counts } = await getStoreOrders(activeStore.id, {
    status: currentStatus,
    searchQuery: currentSearch,
    page: currentPage,
    limit: 50,
  });

  const statusTabs: { label: string; value: string; count: number }[] = [
    { label: 'الكل', value: 'ALL', count: counts.all },
    { label: 'جديد', value: 'NEW', count: counts.new },
    { label: 'تم التواصل', value: 'CONTACTED', count: counts.contacted },
    { label: 'مؤكد', value: 'CONFIRMED', count: counts.confirmed },
    { label: 'قيد التجهيز', value: 'PREPARING', count: counts.preparing },
    { label: 'جاهز', value: 'READY', count: counts.ready },
    { label: 'تم التوصيل', value: 'DELIVERED', count: counts.delivered },
    { label: 'ملغي', value: 'CANCELLED', count: counts.cancelled },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إدارة الطلبات</h1>
          <p className="text-sm text-text-secondary">
            المتجر: <strong className="text-text-primary">{activeStore.name}</strong> ({activeStore.handle}.souqcloud.com)
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3 overflow-x-auto">
        {statusTabs.map((tab) => {
          const isActive = (currentStatusParam || 'ALL') === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/app/orders?status=${tab.value}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-surface text-text-secondary hover:bg-background-secondary border border-border-subtle'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-canvas text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <form method="GET" className="flex items-center gap-3">
          <input
            type="hidden"
            name="status"
            value={currentStatusParam || 'ALL'}
          />
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="البحث برقم الطلب (مثال: 1001)، أو اسم العميل، أو رقم الهاتف..."
              className="w-full px-3 py-2 border border-border-strong rounded-card text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            بحث
          </Button>
        </form>
      </Card>

      {/* Orders Data Table */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            لا توجد طلبات مطابقة
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            {currentSearch || (currentStatusParam && currentStatusParam !== 'ALL')
              ? 'لم يتم العثور على أي طلب يطابق معايير البحث أو التصفية المحددة.'
              : 'لم يستقبل هذا المتجر أي طلبات بعد.'}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-canvas border-b border-border-subtle text-text-secondary text-xs uppercase">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم الطلب</th>
                <th className="py-3.5 px-4 font-bold">التاريخ</th>
                <th className="py-3.5 px-4 font-bold">العميل</th>
                <th className="py-3.5 px-4 font-bold">ملخص المنتجات</th>
                <th className="py-3.5 px-4 font-bold">طريقة الطلب</th>
                <th className="py-3.5 px-4 font-bold">الإجمالي</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
                <th className="py-3.5 px-4 font-bold text-left">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {orders.map((order) => {
                const totalFormatted = (order.totalCents / 100).toFixed(2);

                return (
                  <tr key={order.id} className="hover:bg-background-secondary transition-colors">
                    <td className="py-3.5 px-4 font-bold font-mono text-brand-primary">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-text-secondary font-mono" dir="ltr">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary max-w-[200px] truncate">
                      {order.itemsSummary} ({order.itemsCount} عناصر)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700">
                        {order.orderModeUsed}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-text-primary">
                      {totalFormatted} {order.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <Link href={`/app/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-brand-primary">
                          عرض &larr;
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
