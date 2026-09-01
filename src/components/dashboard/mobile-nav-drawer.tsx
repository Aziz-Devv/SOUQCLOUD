'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardNavItem } from '@/lib/services/dashboard-nav-service';
import { StoreSummary, UserProfile, Merchant, Membership } from '@/lib/types';
import { StoreSwitcher } from '@/components/dashboard/store-switcher';
import { Button } from '@/components/ui/button';
import { handleSignOutAndRedirect } from '@/app/actions/auth';

interface MobileNavDrawerProps {
  navItems: DashboardNavItem[];
  user: UserProfile;
  merchant: Merchant;
  membership: Membership;
  stores: StoreSummary[];
  activeStore: StoreSummary | null;
}

export function MobileNavDrawer({
  navItems,
  user,
  merchant,
  membership,
  stores,
  activeStore,
}: MobileNavDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  // Close drawer upon route change
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      {/* Hamburger Menu Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-label="فتح القائمة الرئيسية"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop & Off-Canvas Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Off-Canvas Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-surface border-l border-border-subtle shadow-card z-50 p-5 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-brand-primary">SOUQCLOUD</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-medium">
                  {membership.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-secondary"
                aria-label="إغلاق القائمة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Store Switcher in Drawer */}
            <div className="py-4 border-b border-border-subtle">
              <div className="text-xs font-semibold text-text-tertiary mb-2">المتجر النشط:</div>
              <StoreSwitcher stores={stores} activeStore={activeStore} />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              <div className="text-xs font-semibold text-text-tertiary px-3 mb-1 uppercase tracking-wider">
                القائمة
              </div>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/app/home' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-2.5 rounded-card text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-primary text-white font-bold'
                        : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer: User Profile & Sign Out */}
            <div className="pt-4 border-t border-border-subtle space-y-3">
              <div className="text-xs">
                <div className="font-bold text-text-primary truncate">{user.fullName || user.email}</div>
                <div className="text-text-tertiary truncate">{merchant.name}</div>
              </div>
              <form action={handleSignOutAndRedirect}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-center text-xs text-feedback-danger hover:bg-red-50"
                >
                  تسجيل الخروج
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
