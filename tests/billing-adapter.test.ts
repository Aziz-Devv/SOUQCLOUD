import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { PaddleBillingAdapter } from '../src/lib/billing/paddle-adapter';

describe('Paddle Billing Adapter Webhook Signature Verification', () => {
  const secret = 'pdl_ntf_set_01hk027z685h02t7h8e24k9y12_test_secret';
  const adapter = new PaddleBillingAdapter({
    apiKey: 'pdl_api_test_key',
    webhookSecret: secret,
    environment: 'sandbox',
  });

  function generateSignatureHeader(rawBody: string, timestamp: number, secretKey: string): string {
    const signedPayload = `${timestamp}:${rawBody}`;
    const hash = crypto.createHmac('sha256', secretKey).update(signedPayload).digest('hex');
    return `ts=${timestamp};h1=${hash}`;
  }

  it('validates a correct HMAC SHA-256 signature with matching raw body and timestamp', async () => {
    const rawBody = JSON.stringify({
      event_id: 'evt_01hkg2x80b6p660x05f884s57c',
      event_type: 'subscription.activated',
      occurred_at: '2026-08-31T12:00:00.000Z',
      data: { id: 'sub_01hkg2x80b6p660x05f884s57c', status: 'active' },
    });

    const now = Math.floor(Date.now() / 1000);
    const signatureHeader = generateSignatureHeader(rawBody, now, secret);

    const isValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader, secret);
    expect(isValid).toBe(true);
  });

  it('rejects verification if raw body has even a single character altered after signing', async () => {
    const originalBody = '{"event_id":"evt_123","event_type":"subscription.created"}';
    const tamperedBody = '{"event_id":"evt_123","event_type":"subscription.created" }'; // extra space
    const now = Math.floor(Date.now() / 1000);
    const signatureHeader = generateSignatureHeader(originalBody, now, secret);

    const isValid = await adapter.verifyWebhookSignature(tamperedBody, signatureHeader, secret);
    expect(isValid).toBe(false);
  });

  it('rejects verification if secret key is incorrect', async () => {
    const rawBody = '{"event_id":"evt_123"}';
    const now = Math.floor(Date.now() / 1000);
    const signatureHeader = generateSignatureHeader(rawBody, now, 'wrong_secret_key');

    const isValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader, secret);
    expect(isValid).toBe(false);
  });

  it('rejects webhooks with timestamp outside the 5-minute (300s) replay window', async () => {
    const rawBody = '{"event_id":"evt_123"}';
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 305; // 305 seconds ago (> 300s)
    const signatureHeader = generateSignatureHeader(rawBody, expiredTimestamp, secret);

    const isValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader, secret);
    expect(isValid).toBe(false);
  });

  it('accepts webhooks with timestamp within the 5-minute (300s) replay window', async () => {
    const rawBody = '{"event_id":"evt_123"}';
    const validTimestamp = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago (< 300s)
    const signatureHeader = generateSignatureHeader(rawBody, validTimestamp, secret);

    const isValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader, secret);
    expect(isValid).toBe(true);
  });

  it('rejects malformed or empty signature headers gracefully without crashing', async () => {
    const rawBody = '{"event_id":"evt_123"}';

    expect(await adapter.verifyWebhookSignature(rawBody, null, secret)).toBe(false);
    expect(await adapter.verifyWebhookSignature(rawBody, '', secret)).toBe(false);
    expect(await adapter.verifyWebhookSignature(rawBody, 'invalid_header_format', secret)).toBe(false);
    expect(await adapter.verifyWebhookSignature(rawBody, 'ts=123', secret)).toBe(false);
    expect(await adapter.verifyWebhookSignature(rawBody, 'h1=abc', secret)).toBe(false);
  });

  it('generates sandbox checkout URLs when running in sandbox mode', async () => {
    const res = await adapter.createSubscriptionCheckout(
      '632e15b5-bd99-440a-b945-c0a5613e023e',
      'GROWTH',
      'MONTHLY'
    );
    expect(res.checkoutUrl).toBeDefined();
    expect(res.checkoutUrl).toContain('sandbox');
  }, 15000);
});
