import Link from 'next/link';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const context = await getDashboardNavContext();

  if (!context) {
    return null; // Handled by layout redirect
  }

  const { user, merchant, membership, stores, activeStore } = context;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">نظرة عامة</h1>
          <p className="text-sm text-text-secondary">
            مرحباً بك، {user.fullName || user.email}
          </p>
        </div>

        <Link href="/app/onboarding/store">
          <Button variant="primary" size="md">
            + إنشاء متجر جديد
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Merchant Organization Card */}
        <Card className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            المنشأة التجارية
          </div>
          <div className="text-xl font-bold text-text-primary">{merchant.name}</div>
          <div className="text-xs font-mono text-text-secondary">معرف الرابط: {merchant.slug}</div>
          <div className="pt-2 flex items-center gap-2">
            <span className="text-xs text-text-secondary">حالة الحساب:</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
              {merchant.status}
            </span>
          </div>
        </Card>

        {/* User Identity Card */}
        <Card className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            هوية المستخدم
          </div>
          <div className="text-xl font-bold text-text-primary">{user.fullName || '—'}</div>
          <div className="text-xs text-text-secondary font-mono">{user.email}</div>
          <div className="pt-2 text-xs text-text-muted">
            تاريخ التسجيل: {new Date(user.createdAt).toLocaleDateString('ar-SA')}
          </div>
        </Card>

        {/* Membership & Role Card */}
        <Card className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            الدور والصلاحيات
          </div>
          <div className="text-xl font-bold text-text-primary">
            {membership.role === 'OWNER'
              ? 'مالك (Owner)'
              : membership.role === 'ADMIN'
              ? 'مدير (Admin)'
              : 'موظف (Staff)'}
          </div>
          <div className="text-xs text-text-secondary">
            {membership.role === 'STAFF'
              ? 'صلاحيات تشغيلية لإدارة المنتجات والطلبات'
              : 'صلاحيات إدارية ومالية للمنشأة'}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <span className="text-xs text-text-secondary">حالة العضوية:</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {membership.status}
            </span>
          </div>
        </Card>
      </div>

      {/* Stores Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">المتاجر التابعة للمنشأة</h2>

        {stores.length === 0 ? (
          <Card className="p-8 text-center bg-surface border border-dashed border-border-strong">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              لم يتم إنشاء أي متجر بعد
            </h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
              ابدأ الآن بإنشاء متجرك الأول لتتمكن من تخصيص الهوية، وتحديد طرق استقبال الطلبات عبر الواتساب ولوحة التحكم.
            </p>
            <Link href="/app/onboarding/store">
              <Button variant="primary" size="lg">
                بدء إعداد المتجر الأول
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.map((s) => {
              const isCurrent = s.id === activeStore?.id;
              return (
                <Card
                  key={s.id}
                  className={`space-y-3 relative transition-all ${
                    isCurrent ? 'ring-2 ring-brand-primary bg-brand-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-text-primary">{s.name}</h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-brand-primary text-white">
                            المتجر النشط
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-brand-primary" dir="ltr">
                        {s.handle}.souqcloud.com
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
                    <div>
                      <span className="block text-text-muted">العملة:</span>
                      <strong className="text-text-primary">{s.currency}</strong>
                    </div>
                    <div>
                      <span className="block text-text-muted">الدولة:</span>
                      <strong className="text-text-primary">{s.defaultCountryCode}</strong>
                    </div>
                    <div>
                      <span className="block text-text-muted">طريقة الطلب:</span>
                      <strong className="text-text-primary">{s.orderMode}</strong>
                    </div>
                  </div>

                  {s.whatsappPhone && (
                    <div className="pt-2 text-xs text-text-secondary">
                      واتساب الطلبات: <strong dir="ltr">{s.whatsappPhone}</strong>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
