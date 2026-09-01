import { z } from 'zod';

export type CustomDomainStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED' | 'SUSPENDED';
export type CustomDomainSslStatus = 'INITIALIZING' | 'PENDING_VALIDATION' | 'ACTIVE' | 'FAILED';

export interface CustomDomainRecord {
  id: string;
  storeId: string;
  hostname: string;
  status: CustomDomainStatus;
  sslStatus: CustomDomainSslStatus;
  cloudflareCustomHostnameId: string | null;
  verificationTxtName: string | null;
  verificationTxtValue: string | null;
  cnameTarget: string;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDomainDetail {
  id: string;
  storeId: string;
  hostname: string;
  status: CustomDomainStatus;
  sslStatus: CustomDomainSslStatus;
  dnsRecords: {
    txt: {
      name: string;
      value: string;
    } | null;
    cname: {
      name: string;
      target: string;
    };
  };
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
}

export interface CloudflareCustomHostnameResult {
  customHostnameId: string;
  hostname: string;
  status: CustomDomainStatus;
  sslStatus: CustomDomainSslStatus;
  verificationTxtName?: string;
  verificationTxtValue?: string;
  cnameTarget: string;
  errorMessage?: string;
}

export interface CustomHostnameAdapter {
  createCustomHostname(hostname: string): Promise<CloudflareCustomHostnameResult>;
  getCustomHostnameStatus(customHostnameId: string): Promise<CloudflareCustomHostnameResult>;
  deleteCustomHostname(customHostnameId: string): Promise<void>;
}

export const AttachCustomDomainSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  hostname: z.string().min(1, 'اسم النطاق مطلوب'),
});

export type AttachCustomDomainInput = z.infer<typeof AttachCustomDomainSchema>;

export const VerifyCustomDomainSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  domainId: z.string().uuid('معرف النطاق غير صالح'),
});

export type VerifyCustomDomainInput = z.infer<typeof VerifyCustomDomainSchema>;

export const RemoveCustomDomainSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
  domainId: z.string().uuid('معرف النطاق غير صالح'),
});

export type RemoveCustomDomainInput = z.infer<typeof RemoveCustomDomainSchema>;
