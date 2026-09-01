import { ValidationError } from '@/lib/errors';

const RESERVED_HOSTNAMES = new Set([
  'souqcloud.com',
  'www.souqcloud.com',
  'app.souqcloud.com',
  'admin.souqcloud.com',
  'api.souqcloud.com',
  'dashboard.souqcloud.com',
  'cdn.souqcloud.com',
  'media.souqcloud.com',
  'assets.souqcloud.com',
  'fallback.souqcloud.com',
  'cname.souqcloud.com',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
]);

const RESERVED_SUFFIXES = [
  '.souqcloud.com',
  '.localhost',
];

/**
 * Normalizes a raw user-supplied hostname string:
 * - Converts to lowercase
 * - Strips protocols (http://, https://)
 * - Strips ports, paths, query params, and trailing dots/slashes
 */
export function normalizeHostname(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    return '';
  }

  let cleaned = rawInput.trim().toLowerCase();

  // Strip protocol if included
  if (cleaned.startsWith('http://')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('https://')) {
    cleaned = cleaned.slice(8);
  }

  // Strip path or query if included
  cleaned = cleaned.split('/')[0] || '';
  cleaned = cleaned.split('?')[0] || '';
  cleaned = cleaned.split('#')[0] || '';

  // Strip port if included
  cleaned = cleaned.split(':')[0] || '';

  // Strip trailing dot if included (DNS FQDN notation)
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned.trim();
}

export interface HostnameValidationResult {
  isValid: boolean;
  hostname: string;
  isSubdomain: boolean;
  isWww: boolean;
  isApex: boolean;
  error?: string;
}

/**
 * Validates a normalized hostname against RFC 1123 format and platform security constraints.
 */
export function validateHostname(rawInput: string): HostnameValidationResult {
  const hostname = normalizeHostname(rawInput);

  if (!hostname) {
    return {
      isValid: false,
      hostname: '',
      isSubdomain: false,
      isWww: false,
      isApex: false,
      error: 'اسم النطاق مطلوب ولا يمكن أن يكون فارغاً',
    };
  }

  // Max total length check (RFC 1035/1123)
  if (hostname.length > 253) {
    return {
      isValid: false,
      hostname,
      isSubdomain: false,
      isWww: false,
      isApex: false,
      error: 'اسم النطاق طويل جداً (الحد الأقصى 253 حرفاً)',
    };
  }

  // Anti-hijacking: Check reserved list
  if (RESERVED_HOSTNAMES.has(hostname)) {
    return {
      isValid: false,
      hostname,
      isSubdomain: false,
      isWww: false,
      isApex: false,
      error: 'اسم النطاق هذا محجوز لخدمات النظام ولا يمكن استخدامه',
    };
  }

  // Check reserved suffixes (e.g. *.souqcloud.com or *.localhost)
  for (const suffix of RESERVED_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return {
        isValid: false,
        hostname,
        isSubdomain: false,
        isWww: false,
        isApex: false,
        error: 'لا يمكن ربط نطاقات فرعية تابعة للنظام كنطاق مخصص',
      };
    }
  }

  // Split into DNS labels
  const labels = hostname.split('.');

  // Must contain at least two labels (e.g. "example.com" or "shop.brand.sa")
  if (labels.length < 2) {
    return {
      isValid: false,
      hostname,
      isSubdomain: false,
      isWww: false,
      isApex: false,
      error: 'يجب أن يكون اسم النطاق نطاقاً كاملاً صالحاً (FQDN) يحتوي على امتداد مثل .com أو .sa',
    };
  }

  // Validate each label
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!;

    if (!label || label.length === 0) {
      return {
        isValid: false,
        hostname,
        isSubdomain: false,
        isWww: false,
        isApex: false,
        error: 'تنسيق اسم النطاق غير صالح (يحتوي على نقط متتالية أو فارغة)',
      };
    }

    if (label.length > 63) {
      return {
        isValid: false,
        hostname,
        isSubdomain: false,
        isWww: false,
        isApex: false,
        error: 'أحد أجزاء النطاق طويل جداً (الحد الأقصى 63 حرفاً لكل مقطع)',
      };
    }

    // Label format: alphanumeric and hyphens, cannot start or end with hyphen
    const labelRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!labelRegex.test(label)) {
      return {
        isValid: false,
        hostname,
        isSubdomain: false,
        isWww: false,
        isApex: false,
        error: 'اسم النطاق يحتوي على أحرف غير مسموح بها. يُسمح فقط بالأحرف الإنجليزية والأرقام والشرطة (-)',
      };
    }
  }

  // TLD check (last label must not be all-numeric)
  const tld = labels[labels.length - 1]!;
  if (/^\d+$/.test(tld)) {
    return {
      isValid: false,
      hostname,
      isSubdomain: false,
      isWww: false,
      isApex: false,
      error: 'لا يمكن استخدام عناوين IP الرقمية كنطاق مخصص',
    };
  }

  const isWww = labels[0] === 'www';
  const isSubdomain = labels.length > 2 && !isWww;
  const isApex = labels.length === 2;

  return {
    isValid: true,
    hostname,
    isSubdomain,
    isWww,
    isApex,
  };
}

/**
 * Asserts that a hostname is valid or throws a ValidationError.
 */
export function assertValidHostname(rawInput: string): string {
  const result = validateHostname(rawInput);
  if (!result.isValid) {
    throw new ValidationError(result.error || 'اسم النطاق غير صالح');
  }
  return result.hostname;
}
