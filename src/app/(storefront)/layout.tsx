import { headers } from 'next/headers';
import {
  resolveStorefrontByHandle,
  resolveStorefrontByCustomDomain,
  getStorefrontTheme,
} from '@/lib/services/storefront-service';
import { generateCssVariables } from '@/lib/theme-engine/tokens';
import { CartProvider } from '@/components/storefront/cart-provider';
import { CartDrawer } from '@/components/storefront/cart-drawer';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle') || '';
  const tenantHost = headerList.get('x-tenant-host') || '';

  let store = null;

  if (tenantHandle) {
    store = await resolveStorefrontByHandle(tenantHandle);
  } else if (tenantHost) {
    store = await resolveStorefrontByCustomDomain(tenantHost);
  }

  // If neither handle nor host is present, render children directly (or apex fallback)
  if (!tenantHandle && !tenantHost) {
    return <div className="min-h-screen bg-canvas text-text-primary">{children}</div>;
  }

  if (!store) {
    const displayHost = tenantHandle ? `${tenantHandle}.souqcloud.com` : tenantHost;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas text-text-primary">
        <div className="max-w-md w-full p-8 bg-surface border border-border-subtle rounded-card shadow-card text-center space-y-4">
          <div className="text-3xl">🏪</div>
          <h1 className="text-xl font-bold text-text-primary">المتجر غير متاح حالياً</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            المتجر المطلوب غير موجود أو تم إيقافه مؤقتاً بواسطة المالك.
          </p>
          <div className="pt-2 text-xs font-mono text-text-muted">
            {displayHost}
          </div>
        </div>
      </div>
    );
  }

  const theme = await getStorefrontTheme(store.id);
  const cssVariables = generateCssVariables(theme.designTokens);

  return (
    <CartProvider storeId={store.id}>
      <div
        className="min-h-screen flex flex-col bg-canvas text-text-primary"
        style={
          {
            backgroundColor: theme.designTokens.colors.bgCanvas,
            color: theme.designTokens.colors.textPrimary,
            fontFamily: theme.designTokens.typography.bodyFont,
          } as React.CSSProperties
        }
      >
        <style>{`:root { ${cssVariables} }`}</style>
        <div className="flex-1 flex flex-col">{children}</div>
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
