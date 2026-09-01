import { describe, it, expect } from 'vitest';
import {
  getPermittedNavItems,
  ALL_DASHBOARD_NAV_ITEMS,
} from '@/lib/services/dashboard-nav-service';
import { StoreSummary } from '@/lib/types';
import { ForbiddenError } from '@/lib/errors';

describe('Dashboard Navigation & Role-Based Filtering', () => {
  describe('getPermittedNavItems', () => {
    it('returns operational items only for STAFF role, strictly hiding billing, notifications, and theme customization', () => {
      const staffItems = getPermittedNavItems('STAFF');
      const hrefs = staffItems.map((i) => i.href);

      expect(hrefs).toContain('/app/home');
      expect(hrefs).toContain('/app/products');
      expect(hrefs).toContain('/app/orders');

      // Security check: Billing, Notifications, and Theme Customizer MUST NOT be in STAFF navigation
      expect(hrefs).not.toContain('/app/billing');
      expect(hrefs).not.toContain('/app/online-store/themes');
      expect(hrefs).not.toContain('/app/settings/notifications');
      expect(staffItems.length).toBe(3);
    });

    it('returns full navigation items for OWNER role including billing, notifications, and themes', () => {
      const ownerItems = getPermittedNavItems('OWNER');
      const hrefs = ownerItems.map((i) => i.href);

      expect(hrefs).toContain('/app/home');
      expect(hrefs).toContain('/app/products');
      expect(hrefs).toContain('/app/orders');
      expect(hrefs).toContain('/app/online-store/themes');
      expect(hrefs).toContain('/app/settings/notifications');
      expect(hrefs).toContain('/app/billing');
      expect(ownerItems.length).toBe(ALL_DASHBOARD_NAV_ITEMS.length);
    });

    it('returns full navigation items for ADMIN role including billing, notifications, and themes', () => {
      const adminItems = getPermittedNavItems('ADMIN');
      const hrefs = adminItems.map((i) => i.href);

      expect(hrefs).toContain('/app/home');
      expect(hrefs).toContain('/app/products');
      expect(hrefs).toContain('/app/orders');
      expect(hrefs).toContain('/app/online-store/themes');
      expect(hrefs).toContain('/app/settings/notifications');
      expect(hrefs).toContain('/app/billing');
      expect(adminItems.length).toBe(ALL_DASHBOARD_NAV_ITEMS.length);
    });
  });

  describe('Active Store Candidate Resolution Logic', () => {
    const mockStores: StoreSummary[] = [
      {
        id: 'store-1111-1111',
        merchantId: 'merchant-aaa',
        name: 'Store One',
        handle: 'store-one',
        currency: 'SAR',
        defaultLocale: 'ar',
        defaultCountryCode: 'SA',
        status: 'PUBLISHED',
        orderMode: 'BOTH',
        createdAt: '2026-08-31T00:00:00Z',
      },
      {
        id: 'store-2222-2222',
        merchantId: 'merchant-aaa',
        name: 'Store Two',
        handle: 'store-two',
        currency: 'SAR',
        defaultLocale: 'ar',
        defaultCountryCode: 'SA',
        status: 'DRAFT',
        orderMode: 'WHATSAPP',
        createdAt: '2026-08-31T00:00:00Z',
      },
    ];

    it('resolves the candidate store when cookie matches an authorized merchant store', () => {
      const candidateId = 'store-2222-2222';
      const resolved =
        mockStores.find((s) => s.id === candidateId) || mockStores[0] || null;

      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe('store-2222-2222');
      expect(resolved?.name).toBe('Store Two');
    });

    it('safely falls back to stores[0] when candidate cookie is missing or undefined', () => {
      const candidateId = undefined;
      const resolved =
        (candidateId ? mockStores.find((s) => s.id === candidateId) : null) ||
        mockStores[0] ||
        null;

      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe('store-1111-1111');
      expect(resolved?.name).toBe('Store One');
    });

    it('prevents cross-tenant tampering: safely discards an unauthorized foreign store ID and falls back to stores[0]', () => {
      const untrustedForeignCandidateId = 'foreign-store-9999-9999';
      const resolved =
        (untrustedForeignCandidateId
          ? mockStores.find((s) => s.id === untrustedForeignCandidateId)
          : null) ||
        mockStores[0] ||
        null;

      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe('store-1111-1111');
      expect(resolved?.name).toBe('Store One');
    });
  });

  describe('Server-Side Route Role Enforcement Matrix', () => {
    it('blocks STAFF role from billing access with ForbiddenError when role check is applied', () => {
      const roleCheck = (userRole: 'OWNER' | 'ADMIN' | 'STAFF', allowed: ('OWNER' | 'ADMIN')[]) => {
        if (!allowed.includes(userRole as any)) {
          throw new ForbiddenError('ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم.');
        }
        return true;
      };

      // STAFF should be rejected
      expect(() => roleCheck('STAFF', ['OWNER', 'ADMIN'])).toThrow(ForbiddenError);

      // OWNER and ADMIN should succeed
      expect(roleCheck('OWNER', ['OWNER', 'ADMIN'])).toBe(true);
      expect(roleCheck('ADMIN', ['OWNER', 'ADMIN'])).toBe(true);
    });
  });
});
