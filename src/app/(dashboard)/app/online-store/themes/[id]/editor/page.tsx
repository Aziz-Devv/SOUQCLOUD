import { notFound, redirect } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { getActiveStoreTheme } from '@/lib/services/theme-service';
import { getStorePages } from '@/lib/services/page-service';
import { getAvailableSectionSchemas } from '@/lib/theme-engine/section-registry';
import { StoreBuilderEditor } from '@/components/editor/store-builder-editor';

export const dynamic = 'force-dynamic';

export default async function ThemeEditorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: _themeId } = await props.params;
  const context = await getDashboardNavContext();

  if (!context || context.stores.length === 0) {
    redirect('/app/onboarding/store');
  }

  // Server-side role guard: STAFF members have no access to theme customization
  if (context.membership.role === 'STAFF') {
    redirect('/app/home');
  }

  const activeStore = context.activeStore;
  if (!activeStore) {
    notFound();
  }

  const activeTheme = await getActiveStoreTheme(activeStore.id);
  const pages = await getStorePages(activeStore.id);

  if (pages.length === 0) {
    notFound();
  }

  const initialPage = pages[0];
  if (!initialPage) {
    notFound();
  }

  const availableSchemas = getAvailableSectionSchemas(activeTheme.themeTemplateId);

  return (
    <StoreBuilderEditor
      initialPage={initialPage}
      storeId={activeStore.id}
      storeName={activeStore.name}
      theme={activeTheme}
      availableSchemas={availableSchemas}
      pages={pages}
    />
  );
}
