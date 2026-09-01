import { headers } from 'next/headers';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  resolveStorefrontByHandle,
  resolveStorefrontByCustomDomain,
  getStorefrontPage,
  getStorefrontProducts,
} from '@/lib/services/storefront-service';
import { ThemeSectionRenderer } from '@/components/storefront/theme-section-renderer';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle') || '';
  const tenantHost = headerList.get('x-tenant-host') || '';

  let store = null;
  if (tenantHandle) {
    store = await resolveStorefrontByHandle(tenantHandle);
  } else if (tenantHost) {
    store = await resolveStorefrontByCustomDomain(tenantHost);
  }

  if (!store) {
    return {
      title: 'SOUQCLOUD | منصة التجارة الإلكترونية السحابية',
    };
  }

  const page = await getStorefrontPage(store.id, '');
  const pageTitle = page?.seo?.title || page?.title || 'الصفحة الرئيسية';

  return {
    title: `${pageTitle} | ${store.name}`,
    description: page?.seo?.description
      ? String(page.seo.description)
      : store.branding.logo_url
        ? String(store.branding.logo_url)
        : `متجر ${store.name} على منصة سوق كلاود`,
  };
}

export default async function StorefrontHomePage() {
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle') || '';
  const tenantHost = headerList.get('x-tenant-host') || '';

  let store = null;
  if (tenantHandle) {
    store = await resolveStorefrontByHandle(tenantHandle);
  } else if (tenantHost) {
    store = await resolveStorefrontByCustomDomain(tenantHost);
  }

  // Apex or direct dev preview without tenant
  if (!store) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-canvas">
        <div className="max-w-md w-full p-8 rounded-card bg-surface border border-border-subtle shadow-card space-y-4">
          <h1 className="text-2xl font-black text-brand-primary">SOUQCLOUD</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            منصة التجارة الإلكترونية السحابية — واجهة المتجر العامة
          </p>
          <div className="pt-2">
            <Link
              href="/app/home"
              className="inline-block px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-btn"
            >
              الدخول للوحة تحكم التاجر
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [page, products] = await Promise.all([
    getStorefrontPage(store.id, ''),
    getStorefrontProducts(store.id),
  ]);

  const sections = page?.sections || [];

  return (
    <div className="flex-1 flex flex-col">
      {sections.map((section) => (
        <ThemeSectionRenderer
          key={section.id}
          section={section}
          store={store}
          products={products}
        />
      ))}
    </div>
  );
}
