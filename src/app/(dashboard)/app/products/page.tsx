import Link from 'next/link';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreProducts } from '@/lib/services/product-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ProductsListPage(props: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">المنتجات</h1>
          <p className="text-sm text-text-secondary">إدارة كتالوج المنتجات والمخزون</p>
        </div>

        <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            يجب إنشاء متجر أولاً لإضافة المنتجات
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            قم بإنشاء وتأسيس متجرك الأول لتتمكن من إضافة المنتجات وتحديد الأسعار وإدارة المخزون.
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
  if (!activeStore) {
    return null;
  }
  const currentStatus = searchParams.status || 'ALL';
  const currentSearch = searchParams.search || '';

  const products = await getStoreProducts(activeStore.id, {
    status: currentStatus,
    search: currentSearch,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">المنتجات</h1>
          <p className="text-sm text-text-secondary">
            إدارة منتجات متجر: <strong className="text-text-primary">{activeStore.name}</strong> ({activeStore.handle}.souqcloud.com)
          </p>
        </div>

        <Link href="/app/products/new">
          <Button variant="primary" size="md">
            + إضافة منتج جديد
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <Card className="p-4 space-y-4">
        <form method="GET" className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="البحث بالاسم أو المعرّف (Slug / SKU)..."
              className="w-full px-3 py-2 border border-border-strong rounded-card text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              name="status"
              defaultValue={currentStatus}
              className="px-3 py-2 border border-border-strong rounded-card text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="ACTIVE">نشط (Active)</option>
              <option value="DRAFT">مسودة (Draft)</option>
              <option value="ARCHIVED">مؤرشف (Archived)</option>
            </select>

            <Button type="submit" variant="secondary" size="md">
              تصفية
            </Button>
          </div>
        </form>
      </Card>

      {/* Product List */}
      {products.length === 0 ? (
        <Card className="p-12 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            لا توجد منتجات مطابقة
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            {currentSearch || currentStatus !== 'ALL'
              ? 'لم يتم العثور على أي منتج يطابق معايير البحث الحالية.'
              : 'لم تقم بإضافة أي منتج لهذا المتجر بعد.'}
          </p>
          <Link href="/app/products/new">
            <Button variant="primary" size="md">
              إضافة منتج الآن
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-canvas border-b border-border-subtle text-text-secondary text-xs uppercase">
              <tr>
                <th className="py-3 px-4">المنتج</th>
                <th className="py-3 px-4">السعر</th>
                <th className="py-3 px-4">النوع / المتغيرات</th>
                <th className="py-3 px-4">المخزون الكلي</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {products.map((p) => {
                const priceFormatted = (p.basePriceCents / 100).toFixed(2);
                const hasMultipleVariants = p.variantsCount > 1;

                return (
                  <tr key={p.id} className="hover:bg-background-secondary transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-text-primary">{p.title}</div>
                      <div className="text-xs text-text-muted font-mono" dir="ltr">
                        /{p.handle}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {hasMultipleVariants ? (
                        <span className="text-xs text-text-secondary">
                          يبدأ من {priceFormatted} {activeStore.currency}
                        </span>
                      ) : (
                        <span className="font-semibold text-text-primary">
                          {priceFormatted} {activeStore.currency}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hasMultipleVariants ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 font-medium">
                          {p.variantsCount} متغيرات
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">منتج بسيط</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          p.totalInventory > 0 ? 'text-emerald-700' : 'text-feedback-danger'
                        }`}
                      >
                        {p.totalInventory > 0 ? `${p.totalInventory} قطعة` : 'نفذت الكمية'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <Link href={`/app/products/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-brand-primary">
                          عرض وتعديل &larr;
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
