import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber } from '../src/lib/utils/phone';

describe('Deterministic Phone Normalization Algorithm', () => {
  it('normalizes Saudi phone numbers with local national leading 0', () => {
    const result = normalizePhoneNumber('0501234567', 'SA');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+966501234567');
    }
  });

  it('normalizes Saudi phone numbers with international 00 prefix', () => {
    const result = normalizePhoneNumber('00966501234567', 'SA');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+966501234567');
    }
  });

  it('normalizes Saudi phone numbers with existing + prefix and formatting symbols', () => {
    const result = normalizePhoneNumber('+966 (50) 123-4567', 'SA');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+966501234567');
    }
  });

  it('normalizes Jordan phone number with leading 0', () => {
    const result = normalizePhoneNumber('0791234567', 'JO');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+962791234567');
    }
  });

  it('normalizes UAE phone number with calling code', () => {
    const result = normalizePhoneNumber('0501234567', 'AE');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+971501234567');
    }
  });

  it('normalizes Egypt phone number', () => {
    const result = normalizePhoneNumber('01012345678', 'EG');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+201012345678');
    }
  });

  it('normalizes Kuwait phone number without national 0 prefix', () => {
    const result = normalizePhoneNumber('99123456', 'KW');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phone).toBe('+96599123456');
    }
  });

  it('rejects invalid or too short phone numbers', () => {
    const result = normalizePhoneNumber('123', 'SA');
    expect(result.success).toBe(false);
  });

  it('rejects unsupported country code', () => {
    const result = normalizePhoneNumber('0501234567', 'ZZ');
    expect(result.success).toBe(false);
  });
});
