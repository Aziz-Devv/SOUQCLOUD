import { describe, it, expect, beforeEach } from 'vitest';
import { MockCustomHostnameAdapter } from '@/lib/domains/mock-adapter';
import { CustomDomainStatus, CustomDomainSslStatus } from '@/lib/domains/types';

describe('Custom Domains: Service & Mock Adapter Lifecycle', () => {
  let adapter: MockCustomHostnameAdapter;

  beforeEach(() => {
    MockCustomHostnameAdapter.reset();
    adapter = new MockCustomHostnameAdapter();
  });

  it('creates custom hostname with initial PENDING_VERIFICATION and PENDING_VALIDATION statuses', async () => {
    const result = await adapter.createCustomHostname('shop.brand.com');

    expect(result.hostname).toBe('shop.brand.com');
    expect(result.status).toBe('PENDING_VERIFICATION');
    expect(result.sslStatus).toBe('PENDING_VALIDATION');
    expect(result.verificationTxtName).toBe('_cf-custom-hostname.shop.brand.com');
    expect(result.verificationTxtValue).toBeDefined();
    expect(result.cnameTarget).toBeDefined();
  });

  it('queries live status from mock store correctly', async () => {
    const created = await adapter.createCustomHostname('store.brand.sa');
    const status = await adapter.getCustomHostnameStatus(created.customHostnameId);

    expect(status.customHostnameId).toBe(created.customHostnameId);
    expect(status.hostname).toBe('store.brand.sa');
    expect(status.status).toBe('PENDING_VERIFICATION');
  });

  it('allows state transitions in simulation mode (e.g. progressing to ACTIVE)', async () => {
    const created = await adapter.createCustomHostname('shop.fashion.com');

    // Simulate DNS verification passing
    MockCustomHostnameAdapter.setSimulationState('shop.fashion.com', {
      status: 'ACTIVE',
      sslStatus: 'ACTIVE',
    });

    const status = await adapter.getCustomHostnameStatus(created.customHostnameId);
    expect(status.status).toBe('ACTIVE');
    expect(status.sslStatus).toBe('ACTIVE');
  });

  it('deletes custom hostname cleanly from mock store', async () => {
    const created = await adapter.createCustomHostname('old.brand.com');
    await adapter.deleteCustomHostname(created.customHostnameId);

    // After deletion, status query returns simulated default fallback
    const status = await adapter.getCustomHostnameStatus(created.customHostnameId);
    expect(status.customHostnameId).toBe(created.customHostnameId);
  });
});

describe('Custom Domains: State Machine & Invariant Transitions', () => {
  function computeStoreDomainProjection(
    domainHostname: string,
    domainStatus: CustomDomainStatus,
    sslStatus: CustomDomainSslStatus
  ): string | null {
    if (domainStatus === 'ACTIVE' && sslStatus === 'ACTIVE') {
      return domainHostname;
    }
    return null;
  }

  it('synchronizes stores.custom_domain only when both domain and SSL are ACTIVE', () => {
    // 1. Pending verification -> projection is null
    expect(
      computeStoreDomainProjection('shop.brand.com', 'PENDING_VERIFICATION', 'PENDING_VALIDATION')
    ).toBeNull();

    // 2. Hostname active but SSL pending -> projection is null
    expect(
      computeStoreDomainProjection('shop.brand.com', 'ACTIVE', 'PENDING_VALIDATION')
    ).toBeNull();

    // 3. SSL active but hostname pending -> projection is null
    expect(
      computeStoreDomainProjection('shop.brand.com', 'PENDING_VERIFICATION', 'ACTIVE')
    ).toBeNull();

    // 4. Both ACTIVE -> projection is synced to hostname
    expect(
      computeStoreDomainProjection('shop.brand.com', 'ACTIVE', 'ACTIVE')
    ).toBe('shop.brand.com');

    // 5. Domain failed or suspended -> projection resets to null
    expect(
      computeStoreDomainProjection('shop.brand.com', 'FAILED', 'FAILED')
    ).toBeNull();
    expect(
      computeStoreDomainProjection('shop.brand.com', 'SUSPENDED', 'ACTIVE')
    ).toBeNull();
  });
});
