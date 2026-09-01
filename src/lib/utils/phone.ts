/**
 * Deterministic Phone Normalization & Validation
 * Source of Truth: docs/02-database/entities/stores.md Section 4
 */

export const COUNTRY_CALLING_CODES: Record<string, string> = {
  SA: '966', // Saudi Arabia
  AE: '971', // United Arab Emirates
  KW: '965', // Kuwait
  QA: '974', // Qatar
  BH: '973', // Bahrain
  OM: '968', // Oman
  EG: '20',  // Egypt
  JO: '962', // Jordan
  IQ: '964', // Iraq
  LB: '961', // Lebanon
  US: '1',   // United States
  GB: '44',  // United Kingdom
};

export const SUPPORTED_COUNTRY_CODES = Object.keys(COUNTRY_CALLING_CODES);

/**
 * Normalizes a raw phone number according to the store's default country code.
 * Returns E.164 formatted string (e.g. +966501234567) or an error issue.
 */
export function normalizePhoneNumber(
  rawPhone: string,
  countryCode: string
): { success: true; phone: string } | { success: false; error: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { success: false, error: 'رقم الهاتف مطلوب.' };
  }

  // 1. Sanitize: Strip all spaces, dashes, parentheses, dots
  const sanitized = rawPhone.trim().replace(/[\s\-().]/g, '');

  const upperCountry = countryCode.toUpperCase();
  const callingCode = COUNTRY_CALLING_CODES[upperCountry];
  if (!callingCode) {
    return { success: false, error: `رمز الدولة ${countryCode} غير مدعوم.` };
  }

  let formatted = sanitized;

  // 2. Handle International / National Prefixes
  if (formatted.startsWith('+')) {
    // Already has leading plus
  } else if (formatted.startsWith('00')) {
    formatted = '+' + formatted.slice(2);
  } else if (formatted.startsWith('0')) {
    // Local national prefix: strip leading 0 and prepend calling code
    formatted = `+${callingCode}${formatted.slice(1)}`;
  } else if (formatted.startsWith(callingCode)) {
    // Number starts with country calling code without leading plus
    formatted = `+${formatted}`;
  } else {
    // Number without country code or leading 0
    formatted = `+${callingCode}${formatted}`;
  }

  // 3. Validate standard E.164 regex: ^\+[1-9]\d{6,14}$
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(formatted)) {
    return {
      success: false,
      error: 'رقم الهاتف غير صالح. يرجى إدخال رقم هاتف صحيح بصيغة دولية.',
    };
  }

  return { success: true, phone: formatted };
}
