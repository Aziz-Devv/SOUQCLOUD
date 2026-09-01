import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../src/lib/logger';

describe('Structured Server Logger', () => {
  it('logs structured JSON with context and redaction of sensitive keys', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const log = new Logger({ request_id: 'req_abc123', store_id: 'store_456' });
    log.info('Merchant updated store settings', {
      store_id: 'store_456',
      password: 'super_secret_password',
      token: 'jwt_secret_token',
      name: 'Aura Studio',
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const loggedJson = JSON.parse(firstCall![0]);

    expect(loggedJson.level).toBe('info');
    expect(loggedJson.message).toBe('Merchant updated store settings');
    expect(loggedJson.context.request_id).toBe('req_abc123');
    expect(loggedJson.meta.password).toBe('[REDACTED]');
    expect(loggedJson.meta.token).toBe('[REDACTED]');
    expect(loggedJson.meta.name).toBe('Aura Studio');

    consoleSpy.mockRestore();
  });
});
