import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getStoreCustomDomain } from '@/lib/services/domain-service';
import { DomainManager } from '@/components/dashboard/domain-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إعدادات النطاق المخصص | سوق كلاود',
  description: 'إدارة وتفعيل النطاق المخصص وشهادة الأمان SSL لمتجرك',
};

export const dynamic = 'force-dynamic';

export default async function CustomDomainSettingsPage() {
  const context = await getDashboardNavContext();

  if (!context || !context.activeStore) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-text-secondary" dir="rtl">
        لم يتم العثور على متجر نشط. يرجى اختيار متجر أولاً.
      </div>
    );
  }

  const domain = await getStoreCustomDomain(context.activeStore.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-1 text-right" dir="rtl">
        <h1 className="text-2xl font-bold text-text-primary">
          إعدادات النطاق الخاص (Custom Domain)
        </h1>
        <p className="text-sm text-text-secondary">
          قم بربط علامتك التجارية بنطاقك المخصص عبر توجيه DNS السريع وشهادات الحماية الآمنة.
        </p>
      </div>

      <DomainManager
        storeId={context.activeStore.id}
        storeHandle={context.activeStore.handle}
        initialDomain={domain}
        userRole={context.membership.role}
      />
    </div>
  );
}
