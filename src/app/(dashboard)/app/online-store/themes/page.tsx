import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreThemes } from '@/lib/services/theme-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeSwitcherCard } from '@/components/themes/theme-switcher-card';
import { StorePublishControl } from '@/components/publishing/store-publish-control';

export const dynamic = 'force-dynamic';

export default async function ThemesManagementPage() {
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">القوالب والتصميم</h1>
          <p className="text-sm text-text-secondary">إدارة قوالب المتجر وتخصيص المظهر</p>
        </div>

        <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            يجب إنشاء متجر أولاً لإدارة القوالب
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            قم بإنشاء وتأسيس متجرك الأول لتتمكن من اختيار وتفعيل القوالب والتصاميم المعتمدة.
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

  // Server-side role guard: STAFF members have no access to theme customization
  if (context.membership.role === 'STAFF') {
    redirect('/app/home');
  }

  const activeStore = context.activeStore;
  if (!activeStore) {
    return null;
  }

  const themes = await getStoreThemes(activeStore.id);
  const activeTheme = themes.find((t) => t.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">قوالب المتجر (Theme Engine)</h1>
          <p className="text-sm text-text-secondary">
            المتجر: <strong className="text-text-primary">{activeStore.name}</strong> ({activeStore.handle}.souqcloud.com)
          </p>
        </div>
      </div>

      {/* Store Publication Status Control */}
      <StorePublishControl
        storeId={activeStore.id}
        storeName={activeStore.name}
        handle={activeStore.handle}
        customDomain={activeStore.customDomain}
        initialStatus={activeStore.status}
      />

      {/* Active Theme Highlight */}
      {activeTheme && (
        <Card className="p-6 border-2 border-brand-primary/30 bg-surface space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-primary text-white">
                  القالب المفعل حالياً
                </span>
                <span className="text-xs text-text-secondary font-mono">
                  {activeTheme.themeTemplateId}
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mt-2">
                {activeTheme.name}
              </h2>
            </div>

            <Link href={`/app/online-store/themes/${activeTheme.id}/editor`}>
              <Button variant="primary" size="md">
                🎨 تخصيص القالب عبر أداة التصميم (Store Builder)
              </Button>
            </Link>
          </div>

          <div className="text-xs text-text-secondary pt-2 border-t border-border-subtle flex items-center justify-between">
            <span>معرف القالب: <code className="font-mono">{activeTheme.themeTemplateId}</code></span>
            <span>تاريخ التفعيل: {new Date(activeTheme.createdAt).toLocaleDateString('ar-SA')}</span>
          </div>
        </Card>
      )}

      {/* Theme Presets List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-text-primary">القوالب والتصاميم المتاحة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <ThemeSwitcherCard
              key={theme.id}
              theme={theme}
              storeId={activeStore.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
