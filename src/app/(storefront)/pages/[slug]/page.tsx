import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  resolveStorefrontByHandle,
  getStorefrontPage,
} from '@/lib/services/storefront-service';
import { ThemeSectionRenderer } from '@/components/storefront/theme-section-renderer';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle');

  if (!tenantHandle) {
    return { title: 'الصفحة | SOUQCLOUD' };
  }

  const store = await resolveStorefrontByHandle(tenantHandle);
  if (!store) {
    return { title: 'المتجر غير متاح' };
  }

  const page = await getStorefrontPage(store.id, slug);
  if (!page) {
    return { title: 'الصفحة غير موجودة' };
  }

  return {
    title: `${page.seo?.title || page.title} | ${store.name}`,
    description: page.seo?.description ? String(page.seo.description) : undefined,
  };
}

export default async function CustomContentPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle');

  if (!tenantHandle) {
    notFound();
  }

  const store = await resolveStorefrontByHandle(tenantHandle);
  if (!store) {
    notFound();
  }

  const page = await getStorefrontPage(store.id, slug);
  if (!page) {
    notFound();
  }

  const sections = page.sections || [];

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full space-y-8">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          {page.title}
        </h1>
      </div>

      {sections.length > 0 ? (
        sections.map((section) => (
          <ThemeSectionRenderer
            key={section.id}
            section={section}
            store={store}
          />
        ))
      ) : (
        <div className="text-sm text-text-secondary leading-relaxed">
          {page.seo?.description ? String(page.seo.description) : 'لا يوجد محتوى في هذه الصفحة.'}
        </div>
      )}
    </div>
  );
}
