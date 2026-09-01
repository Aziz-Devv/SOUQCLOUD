import { describe, it, expect } from 'vitest';
import { GET } from '../src/app/api/health/route';

describe('Health Check Route Handler', () => {
  it('returns healthy status envelope with timestamp and platform name', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.platform).toBe('SOUQCLOUD');
    expect(body.timestamp).toBeDefined();
  });
});
