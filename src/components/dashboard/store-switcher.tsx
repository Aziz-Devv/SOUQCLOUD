'use client';

import * as React from 'react';
import Link from 'next/link';
import { StoreSummary } from '@/lib/types';
import { switchActiveStoreAction } from '@/app/actions/dashboard';
import { Button } from '@/components/ui/button';

interface StoreSwitcherProps {
  stores: StoreSummary[];
  activeStore: StoreSummary | null;
}

export function StoreSwitcher({ stores, activeStore }: StoreSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchStore = (storeId: string) => {
    if (storeId === activeStore?.id) {
      setIsOpen(false);
      return;
    }

    startTransition(async () => {
      await switchActiveStoreAction({ storeId });
      setIsOpen(false);
    });
  };

  if (!activeStore && stores.length === 0) {
    return (
      <Link href="/app/onboarding/store">
        <Button size="sm" variant="secondary" className="text-xs">
          + إنشاء متجر
        </Button>
      </Link>
    );
  }

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-background-secondary text-text-primary text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
          {activeStore ? activeStore.name : 'اختر متجراً'}
        </span>
        <span className="text-xs text-text-secondary">({activeStore?.handle})</span>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-card bg-surface border border-border-subtle shadow-card z-50 py-1 divide-y divide-border-subtle animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Active Store Header */}
          <div className="px-4 py-2.5 bg-canvas/50">
            <div className="text-xs font-medium text-text-secondary">المتجر النشط حالياً:</div>
            <div className="text-sm font-bold text-text-primary truncate">{activeStore?.name}</div>
            <div className="text-xs text-text-tertiary font-mono truncate mt-0.5">
              {activeStore?.handle}.souqcloud.com
            </div>
          </div>

          {/* Store List */}
          <div className="py-1 max-h-60 overflow-y-auto">
            <div className="px-3 py-1 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              متاجرك المتاحة ({stores.length})
            </div>
            {stores.map((store) => {
              const isCurrent = store.id === activeStore?.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleSwitchStore(store.id)}
                  disabled={isPending}
                  className={`w-full text-right px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                    isCurrent
                      ? 'bg-brand-primary/10 text-brand-primary font-bold'
                      : 'hover:bg-background-secondary text-text-primary'
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate">{store.name}</div>
                    <div className="text-xs text-text-secondary font-mono truncate">
                      {store.handle}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-primary text-white font-medium">
                      النشط
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation Action: Create New Store */}
          <div className="p-2">
            <Link
              href="/app/onboarding/store"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/5 rounded-md transition-colors"
            >
              <span>+</span>
              <span>إنشاء متجر جديد</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
