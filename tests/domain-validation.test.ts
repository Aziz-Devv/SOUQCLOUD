import { describe, it, expect } from 'vitest';
import {
  normalizeHostname,
  validateHostname,
  assertValidHostname,
} from '@/lib/domains/validation';
import { AppError } from '@/lib/errors';

describe('Custom Domains: Hostname Validation & Normalization', () => {
  describe('normalizeHostname', () => {
    it('lowercases and trims hostname input', () => {
      expect(normalizeHostname('  Shop.Brand.COM  ')).toBe('shop.brand.com');
    });

    it('strips http and https protocols', () => {
      expect(normalizeHostname('https://shop.brand.com')).toBe('shop.brand.com');
      expect(normalizeHostname('http://shop.brand.com')).toBe('shop.brand.com');
    });

    it('strips ports, paths, query parameters, and trailing slashes', () => {
      expect(normalizeHostname('https://shop.brand.com:3000/products?page=1#header')).toBe('shop.brand.com');
      expect(normalizeHostname('shop.brand.com/')).toBe('shop.brand.com');
    });

    it('strips DNS trailing dot notation', () => {
      expect(normalizeHostname('shop.brand.com.')).toBe('shop.brand.com');
    });

    it('handles empty or null inputs gracefully', () => {
      expect(normalizeHostname('')).toBe('');
      // @ts-expect-error test non-string input
      expect(normalizeHostname(null)).toBe('');
    });
  });

  describe('validateHostname', () => {
    it('accepts valid subdomains and www hostnames', () => {
      const validHosts = [
        'shop.alreem.com',
        'store.fashionbrand.sa',
        'buy.mybrand.co.uk',
        'www.mybrand.com',
        'sub-domain.example.org',
        '123.brand.com',
      ];

      for (const host of validHosts) {
        const result = validateHostname(host);
        expect(result.isValid).toBe(true);
        expect(result.hostname).toBe(host);
        expect(result.error).toBeUndefined();
      }
    });

    it('correctly identifies subdomain vs www vs apex types', () => {
      expect(validateHostname('shop.brand.com').isSubdomain).toBe(true);
      expect(validateHostname('shop.brand.com').isWww).toBe(false);

      expect(validateHostname('www.brand.com').isWww).toBe(true);
      expect(validateHostname('www.brand.com').isSubdomain).toBe(false);

      expect(validateHostname('brand.com').isApex).toBe(true);
    });

    it('rejects empty or whitespace-only hostnames', () => {
      const result = validateHostname('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('مطلوب');
    });

    it('rejects reserved platform apex and system hostnames', () => {
      const reserved = [
        'souqcloud.com',
        'www.souqcloud.com',
        'app.souqcloud.com',
        'admin.souqcloud.com',
        'api.souqcloud.com',
        'dashboard.souqcloud.com',
        'cdn.souqcloud.com',
        'media.souqcloud.com',
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
      ];

      for (const host of reserved) {
        const result = validateHostname(host);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('محجوز');
      }
    });

    it('rejects reserved platform subdomains (*.souqcloud.com and *.localhost)', () => {
      const invalid = [
        'test.souqcloud.com',
        'merchant-a.souqcloud.com',
        'sub.localhost',
      ];

      for (const host of invalid) {
        const result = validateHostname(host);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('لا يمكن ربط نطاقات فرعية تابعة للنظام');
      }
    });

    it('rejects single-word or non-FQDN hostnames', () => {
      const invalid = ['myshop', 'brand', 'test'];

      for (const host of invalid) {
        const result = validateHostname(host);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('FQDN');
      }
    });

    it('rejects hostnames with invalid characters or format', () => {
      const invalid = [
        'shop..brand.com',
        '-shop.brand.com',
        'shop-.brand.com',
        'shop_brand.com',
        'shop!brand.com',
        'shop@brand.com',
      ];

      for (const host of invalid) {
        const result = validateHostname(host);
        expect(result.isValid).toBe(false);
      }
    });

    it('rejects numeric IP addresses', () => {
      const result = validateHostname('192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('IP');
    });

    it('rejects excessively long hostnames (>253 chars)', () => {
      const longLabel = 'a'.repeat(60);
      const longHost = `${longLabel}.${longLabel}.${longLabel}.${longLabel}.${longLabel}.com`;
      const result = validateHostname(longHost);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('طويل جداً');
    });
  });

  describe('assertValidHostname', () => {
    it('returns normalized hostname when valid', () => {
      expect(assertValidHostname('  SHOP.MyBrand.COM  ')).toBe('shop.mybrand.com');
    });

    it('throws AppError with 400 status when invalid', () => {
      expect(() => assertValidHostname('souqcloud.com')).toThrow(AppError);
      try {
        assertValidHostname('invalid_host');
      } catch (err: unknown) {
        expect((err as AppError).statusCode).toBe(400);
      }
    });
  });
});
