import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getProductDetailById } from '@/lib/services/product-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage(props: {
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

  let productDetail;
  try {
    productDetail = await getProductDetailById(id, activeStore.id);
  } catch {
    notFound();
  }

  const baseVariant = productDetail.variants[0];
  const priceFormatted = baseVariant ? (baseVariant.priceCents / 100).toFixed(2) : '0.00';
  const compareAtFormatted =
    baseVariant && baseVariant.compareAtPriceCents
      ? (baseVariant.compareAtPriceCents / 100).toFixed(2)
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'المنتجات', href: '/app/products' },
          { label: productDetail.title },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{productDetail.title}</h1>
          <p className="text-xs font-mono text-text-muted" dir="ltr">
            /{productDetail.handle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/app/products">
            <Button variant="secondary" size="md">
              &rarr; العودة لقائمة المنتجات
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Overview Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <span className="text-xs font-semibold text-text-secondary">الحالة الحالية:</span>
            <span
              className={`mr-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                productDetail.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : productDetail.status === 'DRAFT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {productDetail.status}
            </span>
          </div>

          <div className="text-xs text-text-muted">
            تاريخ الإضافة: {new Date(productDetail.createdAt).toLocaleDateString('ar-SA')}
          </div>
        </div>

        {productDetail.description && (
          <div>
            <h3 className="text-sm font-semibold text-text-secondary mb-1">الوصف:</h3>
            <p className="text-sm text-text-primary whitespace-pre-line bg-canvas p-3 rounded-card border border-border-subtle">
              {productDetail.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-sm">
          <div>
            <span className="text-xs text-text-secondary block">السعر الأساسي:</span>
            <strong className="text-text-primary text-base">
              {priceFormatted} {activeStore.currency}
            </strong>
          </div>
          {compareAtFormatted && (
            <div>
              <span className="text-xs text-text-secondary block">السعر قبل الخصم:</span>
              <span className="text-text-muted line-through text-base">
                {compareAtFormatted} {activeStore.currency}
              </span>
            </div>
          )}
          <div>
            <span className="text-xs text-text-secondary block">الخيارات المتاحة:</span>
            <strong className="text-text-primary text-base">
              {productDetail.options.length > 0
                ? productDetail.options.map((o) => o.name).join('، ')
                : 'بدون خيارات (بسيط)'}
            </strong>
          </div>
        </div>
      </Card>

      {/* Variants & Inventory Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">
          المتغيرات والمخزون ({productDetail.variants.length})
        </h2>

        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-canvas border-b border-border-subtle text-text-secondary text-xs uppercase">
              <tr>
                <th className="py-3 px-4">المتغير (Variant)</th>
                <th className="py-3 px-4">رمز التخزين (SKU)</th>
                <th className="py-3 px-4">السعر</th>
                <th className="py-3 px-4">الكمية في المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {productDetail.variants.map((v) => (
                <tr key={v.id} className="hover:bg-background-secondary transition-colors">
                  <td className="py-3 px-4 font-semibold text-text-primary">
                    {v.title}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-text-secondary">
                    {v.sku || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {(v.priceCents / 100).toFixed(2)} {activeStore.currency}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold ${
                        v.inventoryQuantity > 0 ? 'text-emerald-700' : 'text-feedback-danger'
                      }`}
                    >
                      {v.inventoryQuantity} قطعة
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
