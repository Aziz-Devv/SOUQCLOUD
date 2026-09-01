import Link from 'next/link';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductCreateForm } from '@/components/products/product-create-form';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إضافة منتج جديد</h1>
          <p className="text-sm text-text-secondary">يجب إنشاء متجر أولاً</p>
        </div>

        <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            لم تقم بإنشاء متجر بعد
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            قم بإنشاء وتأسيس متجرك الأول لتتمكن من إضافة المنتجات والبدء في البيع.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'المنتجات', href: '/app/products' },
          { label: 'إضافة منتج جديد' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إضافة منتج جديد</h1>
          <p className="text-sm text-text-secondary">
            المتجر: <strong className="text-text-primary">{activeStore.name}</strong> ({activeStore.handle}.souqcloud.com)
          </p>
        </div>

        <Link href="/app/products">
          <Button variant="secondary" size="md">
            &rarr; إلغاء والعودة
          </Button>
        </Link>
      </div>

      <ProductCreateForm
        storeId={activeStore.id}
        currency={activeStore.currency}
      />
    </div>
  );
}
