import { describe, it, expect } from 'vitest';
import { normalizeHostname } from '@/lib/domains/validation';

describe('Custom Domains: Storefront Host Resolution & Edge Proxy Logic', () => {
  interface MockStoreDomainRecord {
    hostname: string;
    domainStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED' | 'SUSPENDED';
    storeId: string;
    storeHandle: string;
    storeStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  }

  const mockDatabase: MockStoreDomainRecord[] = [
    {
      hostname: 'shop.alreem.com',
      domainStatus: 'ACTIVE',
      storeId: 'store-1',
      storeHandle: 'alreem',
      storeStatus: 'PUBLISHED',
    },
    {
      hostname: 'www.fashionbrand.sa',
      domainStatus: 'ACTIVE',
      storeId: 'store-2',
      storeHandle: 'fashionbrand',
      storeStatus: 'PUBLISHED',
    },
    {
      hostname: 'pending.boutique.com',
      domainStatus: 'PENDING_VERIFICATION',
      storeId: 'store-3',
      storeHandle: 'boutique',
      storeStatus: 'PUBLISHED',
    },
    {
      hostname: 'draft.mystore.com',
      domainStatus: 'ACTIVE',
      storeId: 'store-4',
      storeHandle: 'mystore',
      storeStatus: 'DRAFT',
    },
  ];

  // Pure function mirroring the hardened resolve_store_by_custom_domain SQL RPC
  function mockResolveStoreByCustomDomain(rawHostname: string) {
    const cleanHost = normalizeHostname(rawHostname);
    if (!cleanHost) return null;

    const match = mockDatabase.find(
      (r) => r.hostname === cleanHost && r.domainStatus === 'ACTIVE' && r.storeStatus === 'PUBLISHED'
    );

    if (!match) return null;

    return {
      storeId: match.storeId,
      handle: match.storeHandle,
    };
  }

  it('resolves published stores with active custom domains successfully', () => {
    const result1 = mockResolveStoreByCustomDomain('shop.alreem.com');
    expect(result1).not.toBeNull();
    expect(result1?.handle).toBe('alreem');

    const result2 = mockResolveStoreByCustomDomain('www.fashionbrand.sa');
    expect(result2).not.toBeNull();
    expect(result2?.handle).toBe('fashionbrand');
  });

  it('handles case-insensitivity and ports seamlessly', () => {
    const result = mockResolveStoreByCustomDomain('  Shop.Alreem.COM:3000  ');
    expect(result).not.toBeNull();
    expect(result?.handle).toBe('alreem');
  });

  it('rejects domains that are in PENDING_VERIFICATION status', () => {
    const result = mockResolveStoreByCustomDomain('pending.boutique.com');
    expect(result).toBeNull();
  });

  it('rejects domains where parent store is in DRAFT or ARCHIVED status', () => {
    const result = mockResolveStoreByCustomDomain('draft.mystore.com');
    expect(result).toBeNull();
  });

  it('returns null for unknown hostnames', () => {
    const result = mockResolveStoreByCustomDomain('unknown.domain.org');
    expect(result).toBeNull();
  });
});
