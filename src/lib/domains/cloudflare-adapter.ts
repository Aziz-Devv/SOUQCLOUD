import { CloudflareCustomHostnameResult, CustomDomainStatus, CustomDomainSslStatus, CustomHostnameAdapter } from './types';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface CloudflareApiError {
  code: number;
  message: string;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: string[];
  result: T;
}

interface CloudflareCustomHostnameApiResult {
  id: string;
  hostname: string;
  status: string;
  ssl?: {
    status?: string;
    method?: string;
    type?: string;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
      cname?: string;
      cname_target?: string;
    }>;
    validation_errors?: Array<{
      message?: string;
    }>;
  };
  ownership_verification?: {
    type?: string;
    name?: string;
    value?: string;
  };
  ownership_verification_http?: {
    http_url?: string;
    http_body?: string;
  };
  verification_errors?: string[];
}

export class CloudflareCustomHostnameClient implements CustomHostnameAdapter {
  private zoneId: string;
  private apiToken: string;
  private fallbackOrigin: string;

  constructor(options?: { zoneId?: string; apiToken?: string; fallbackOrigin?: string }) {
    this.zoneId = options?.zoneId || process.env.CLOUDFLARE_ZONE_ID || '';
    this.apiToken = options?.apiToken || process.env.CLOUDFLARE_API_TOKEN || '';
    this.fallbackOrigin = options?.fallbackOrigin || process.env.CLOUDFLARE_FALLBACK_ORIGIN || 'cname.souqcloud.com';

    if (!this.zoneId || !this.apiToken) {
      logger.warn('CloudflareCustomHostnameClient initialized without complete credentials');
    }
  }

  private mapHostnameStatus(status: string): CustomDomainStatus {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'ACTIVE';
      case 'pending':
      case 'pending_validation':
        return 'PENDING_VERIFICATION';
      case 'blocked':
      case 'moved':
        return 'FAILED';
      default:
        return 'PENDING_VERIFICATION';
    }
  }

  private mapSslStatus(status: string): CustomDomainSslStatus {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'ACTIVE';
      case 'initializing':
        return 'INITIALIZING';
      case 'pending_validation':
      case 'pending_issuance':
      case 'pending_deployment':
        return 'PENDING_VALIDATION';
      case 'expired':
      case 'deleted':
      case 'failed':
        return 'FAILED';
      default:
        return 'INITIALIZING';
    }
  }

  async createCustomHostname(hostname: string): Promise<CloudflareCustomHostnameResult> {
    if (!this.zoneId || !this.apiToken) {
      throw new AppError('INTERNAL_ERROR', 'بيانات الاعتماد الخاصة بـ Cloudflare غير مهيأة في بيئة النظام', 503);
    }

    const cleanHost = hostname.trim().toLowerCase();
    const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames`;

    const payload = {
      hostname: cleanHost,
      ssl: {
        method: 'txt',
        type: 'dv',
        settings: {
          min_tls_version: '1.2',
          http2: 'on',
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as CloudflareResponse<CloudflareCustomHostnameApiResult>;

    if (!response.ok || !data.success) {
      const errorMsg = data.errors?.map((e) => e.message).join(', ') || 'فشل الاتصال بـ Cloudflare لإنشاء النطاق المخصص';
      logger.error('Cloudflare API createCustomHostname failed', {
        status: response.status,
        errors: data.errors,
        hostname: cleanHost,
      });

      // Handle duplicate hostname error gracefully
      if (data.errors?.some((e) => e.code === 1406 || e.message?.includes('already exists') || e.message?.includes('duplicate'))) {
        throw new AppError('CONFLICT', 'هذا النطاق مسجل بالفعل في Cloudflare أو مستخدم من قبل متجر آخر', 409);
      }

      // Handle unallocated SaaS quota / SSL for SaaS not enabled on zone
      if (data.errors?.some((e) => e.code === 1404 || e.message?.includes('No quota has been allocated'))) {
        throw new AppError(
          'INTERNAL_ERROR',
          'خدمة Cloudflare for SaaS (Custom Hostnames) غير مفعلة على هذا النطاق في Cloudflare. يرجى تفعيل الخدمة من لوحة تحكم Cloudflare.',
          502
        );
      }

      throw new AppError('INTERNAL_ERROR', errorMsg, 502);
    }

    const result = data.result;
    const txtName = result.ownership_verification?.name || (result.ssl?.validation_records?.[0]?.txt_name) || `_cf-custom-hostname.${cleanHost}`;
    const txtValue = result.ownership_verification?.value || (result.ssl?.validation_records?.[0]?.txt_value) || '';

    return {
      customHostnameId: result.id,
      hostname: cleanHost,
      status: this.mapHostnameStatus(result.status),
      sslStatus: this.mapSslStatus(result.ssl?.status || 'initializing'),
      verificationTxtName: txtName,
      verificationTxtValue: txtValue,
      cnameTarget: this.fallbackOrigin,
    };
  }

  async getCustomHostnameStatus(customHostnameId: string): Promise<CloudflareCustomHostnameResult> {
    if (!this.zoneId || !this.apiToken) {
      throw new AppError('INTERNAL_ERROR', 'بيانات الاعتماد الخاصة بـ Cloudflare غير مهيأة في بيئة النظام', 503);
    }

    const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames/${customHostnameId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = (await response.json()) as CloudflareResponse<CloudflareCustomHostnameApiResult>;

    if (!response.ok || !data.success) {
      const errorMsg = data.errors?.map((e) => e.message).join(', ') || 'فشل التحقق من حالة النطاق لدى Cloudflare';
      logger.error('Cloudflare API getCustomHostnameStatus failed', {
        status: response.status,
        errors: data.errors,
        customHostnameId,
      });

      if (response.status === 404) {
        throw new AppError('NOT_FOUND', 'النطاق المخصص غير موجود لدى Cloudflare', 404);
      }

      throw new AppError('INTERNAL_ERROR', errorMsg, 502);
    }

    const result = data.result;
    const hostnameStatus = this.mapHostnameStatus(result.status);
    const sslStatus = this.mapSslStatus(result.ssl?.status || '');

    // Comprehensive error extraction
    const errors: string[] = [];
    if (result.verification_errors && result.verification_errors.length > 0) {
      errors.push(...result.verification_errors);
    }
    if (result.ssl?.validation_errors && result.ssl.validation_errors.length > 0) {
      result.ssl.validation_errors.forEach((v) => {
        if (v.message) errors.push(v.message);
      });
    }

    const txtName = result.ownership_verification?.name || result.ssl?.validation_records?.[0]?.txt_name;
    const txtValue = result.ownership_verification?.value || result.ssl?.validation_records?.[0]?.txt_value;

    return {
      customHostnameId: result.id,
      hostname: result.hostname,
      status: hostnameStatus,
      sslStatus,
      verificationTxtName: txtName,
      verificationTxtValue: txtValue,
      cnameTarget: this.fallbackOrigin,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined,
    };
  }

  async deleteCustomHostname(customHostnameId: string): Promise<void> {
    if (!this.zoneId || !this.apiToken) {
      logger.warn('Skipping Cloudflare deleteCustomHostname: API credentials missing');
      return;
    }

    const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames/${customHostnameId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status !== 404) {
      const data = (await response.json().catch(() => ({}))) as CloudflareResponse<unknown>;
      logger.error('Cloudflare API deleteCustomHostname non-200 response', {
        status: response.status,
        errors: data?.errors,
        customHostnameId,
      });
      // Do not throw on 404 since it's already deleted in Cloudflare
    }
  }
}
