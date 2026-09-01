import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardNavContext } from '@/lib/services/dashboard-nav-service';
import { handleSignOutAndRedirect } from '@/app/actions/auth';
import { StoreSwitcher } from '@/components/dashboard/store-switcher';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { MobileNavDrawer } from '@/components/dashboard/mobile-nav-drawer';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardNavContext();

  if (!context) {
    redirect('/login');
  }

  const { user, merchant, membership, stores, activeStore, navItems } = context;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary">
      {/* Top Application Bar (64px height) */}
      <header className="h-16 border-b border-border-subtle bg-surface px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        {/* Brand + Store Switcher Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile Drawer Trigger */}
          <MobileNavDrawer
            navItems={navItems}
            user={user}
            merchant={merchant}
            membership={membership}
            stores={stores}
            activeStore={activeStore}
          />

          <Link href="/app/home" className="font-bold text-lg text-brand-primary tracking-tight">
            SOUQCLOUD
          </Link>

          <span className="text-border-strong hidden sm:inline select-none">/</span>

          {/* Desktop Store Switcher */}
          <div className="hidden sm:block">
            <StoreSwitcher stores={stores} activeStore={activeStore} />
          </div>
        </div>

        {/* User Info & Actions Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-text-primary truncate max-w-[180px]">
              {user.fullName || user.email}
            </div>
            <div className="text-xs text-text-secondary truncate max-w-[180px]">
              {merchant.name}
            </div>
          </div>

          <form action={handleSignOutAndRedirect}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-xs text-feedback-danger hover:bg-red-50 font-medium"
            >
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </header>

      {/* Main Container with Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-aware Desktop Sidebar */}
        <DashboardSidebar navItems={navItems} role={membership.role} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
