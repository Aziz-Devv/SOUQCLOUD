import { CloudflareCustomHostnameResult, CustomDomainStatus, CustomDomainSslStatus, CustomHostnameAdapter } from './types';
import { logger } from '@/lib/logger';

interface MockStoredHostname {
  customHostnameId: string;
  hostname: string;
  status: CustomDomainStatus;
  sslStatus: CustomDomainSslStatus;
  verificationTxtName: string;
  verificationTxtValue: string;
  cnameTarget: string;
  simulateFailure?: boolean;
}

/**
 * Deterministic Mock Adapter for Cloudflare for SaaS custom hostnames.
 * Used during local development and automated testing.
 */
export class MockCustomHostnameAdapter implements CustomHostnameAdapter {
  private static store: Map<string, MockStoredHostname> = new Map();

  static reset() {
    this.store.clear();
  }

  static setSimulationState(hostname: string, state: { status: CustomDomainStatus; sslStatus: CustomDomainSslStatus }) {
    for (const item of this.store.values()) {
      if (item.hostname === hostname.toLowerCase()) {
        item.status = state.status;
        item.sslStatus = state.sslStatus;
        break;
      }
    }
  }

  async createCustomHostname(hostname: string): Promise<CloudflareCustomHostnameResult> {
    const cleanHost = hostname.trim().toLowerCase();
    const customHostnameId = `cf-mock-${crypto.randomUUID()}`;
    const txtName = `_cf-custom-hostname.${cleanHost}`;
    const txtValue = crypto.randomUUID();
    const cnameTarget = process.env.CLOUDFLARE_FALLBACK_ORIGIN || 'cname.souqcloud.com';

    const record: MockStoredHostname = {
      customHostnameId,
      hostname: cleanHost,
      status: 'PENDING_VERIFICATION',
      sslStatus: 'PENDING_VALIDATION',
      verificationTxtName: txtName,
      verificationTxtValue: txtValue,
      cnameTarget,
    };

    MockCustomHostnameAdapter.store.set(customHostnameId, record);

    logger.info('MockCustomHostnameAdapter: Created mock custom hostname', {
      customHostnameId,
      hostname: cleanHost,
      txtName,
    });

    return {
      customHostnameId,
      hostname: cleanHost,
      status: 'PENDING_VERIFICATION',
      sslStatus: 'PENDING_VALIDATION',
      verificationTxtName: txtName,
      verificationTxtValue: txtValue,
      cnameTarget,
    };
  }

  async getCustomHostnameStatus(customHostnameId: string): Promise<CloudflareCustomHostnameResult> {
    const existing = MockCustomHostnameAdapter.store.get(customHostnameId);

    if (!existing) {
      // Return a simulated active status if not found in mock store (e.g. testing fallback)
      return {
        customHostnameId,
        hostname: 'mock-unknown.com',
        status: 'ACTIVE',
        sslStatus: 'ACTIVE',
        cnameTarget: 'cname.souqcloud.com',
      };
    }

    return {
      customHostnameId: existing.customHostnameId,
      hostname: existing.hostname,
      status: existing.status,
      sslStatus: existing.sslStatus,
      verificationTxtName: existing.verificationTxtName,
      verificationTxtValue: existing.verificationTxtValue,
      cnameTarget: existing.cnameTarget,
    };
  }

  async deleteCustomHostname(customHostnameId: string): Promise<void> {
    MockCustomHostnameAdapter.store.delete(customHostnameId);
    logger.info('MockCustomHostnameAdapter: Deleted custom hostname', { customHostnameId });
  }
}
