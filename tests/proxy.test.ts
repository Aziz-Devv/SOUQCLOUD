import { describe, it, expect } from 'vitest';
import { parseHostname } from '../src/proxy';

describe('Next.js 16 Proxy Hostname Parsing', () => {
  it('identifies dashboard subdomain', () => {
    const result = parseHostname('app.souqcloud.com');
    expect(result.isDashboard).toBe(true);
    expect(result.isStorefront).toBe(false);
    expect(result.isMarketing).toBe(false);
    expect(result.handle).toBeNull();
  });

  it('identifies apex / marketing domain', () => {
    const result = parseHostname('souqcloud.com');
    expect(result.isMarketing).toBe(true);
    expect(result.isDashboard).toBe(false);
    expect(result.isStorefront).toBe(false);
  });

  it('identifies storefront subdomain and extracts handle', () => {
    const result = parseHostname('fashion-brand.souqcloud.com');
    expect(result.isStorefront).toBe(true);
    expect(result.isDashboard).toBe(false);
    expect(result.isMarketing).toBe(false);
    expect(result.handle).toBe('fashion-brand');
  });

  it('identifies custom domain', () => {
    const result = parseHostname('www.customshop.com');
    expect(result.isStorefront).toBe(true);
    expect(result.isDashboard).toBe(false);
    expect(result.isMarketing).toBe(false);
    expect(result.handle).toBeNull();
    expect(result.host).toBe('www.customshop.com');
  });
});
