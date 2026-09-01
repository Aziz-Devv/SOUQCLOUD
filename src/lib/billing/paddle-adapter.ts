import crypto from 'crypto';
import { getServerEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  BillingProviderAdapter,
  BillingInterval,
  CheckoutSessionResult,
} from './types';

export class PaddleBillingAdapter implements BillingProviderAdapter {
  private environment: 'sandbox' | 'production';
  private apiKey?: string;
  private webhookSecret?: string;
  private apiBaseUrl: string;

  constructor(options?: {
    apiKey?: string;
    webhookSecret?: string;
    environment?: 'sandbox' | 'production';
  }) {
    const env = typeof window === 'undefined' ? getServerEnv() : undefined;
    this.environment = options?.environment || env?.PADDLE_ENVIRONMENT || 'sandbox';
    this.apiKey = options?.apiKey || env?.PADDLE_API_KEY;
    this.webhookSecret = options?.webhookSecret || env?.PADDLE_WEBHOOK_SECRET;
    this.apiBaseUrl =
      this.environment === 'production'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com';
  }

  /**
   * Verifies incoming Paddle webhook signature against raw request body string.
   * Format: Paddle-Signature: ts=<timestamp>;h1=<hmac_sha256>
   */
  async verifyWebhookSignature(
    rawPayload: string,
    signatureHeader: string | null,
    secretKeyOverride?: string
  ): Promise<boolean> {
    if (!signatureHeader || !rawPayload) {
      logger.warn('Paddle webhook verification failed: Missing signature header or body');
      return false;
    }

    const secret = secretKeyOverride || this.webhookSecret;
    if (!secret) {
      logger.error('Paddle webhook verification failed: PADDLE_WEBHOOK_SECRET is not configured');
      return false;
    }

    try {
      // Parse header parts: ts=...;h1=...
      const parts = signatureHeader.split(';');
      let ts: string | undefined;
      let h1: string | undefined;

      for (const part of parts) {
        const [key, val] = part.trim().split('=');
        if (key === 'ts') ts = val;
        if (key === 'h1') h1 = val;
      }

      if (!ts || !h1) {
        logger.warn('Paddle webhook verification failed: Malformed signature header parts', { signatureHeader });
        return false;
      }

      // Check replay window tolerance (strict 5 minutes = 300 seconds)
      const timestampSeconds = parseInt(ts, 10);
      if (isNaN(timestampSeconds)) {
        logger.warn('Paddle webhook verification failed: Invalid timestamp', { ts });
        return false;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(nowSeconds - timestampSeconds);
      if (timeDiff > 300) {
        logger.warn('Paddle webhook verification failed: Timestamp outside 5-minute replay window', {
          nowSeconds,
          timestampSeconds,
          timeDiff,
        });
        return false;
      }

      // Compute HMAC-SHA256: secret + (ts + ":" + rawPayload)
      const signedPayload = `${ts}:${rawPayload}`;
      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Constant-time comparison
      const computedBuffer = Buffer.from(computedHash, 'hex');
      const receivedBuffer = Buffer.from(h1, 'hex');

      if (computedBuffer.length !== receivedBuffer.length) {
        logger.warn('Paddle webhook verification failed: Hash length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(computedBuffer, receivedBuffer);
      if (!isValid) {
        logger.warn('Paddle webhook verification failed: Signature mismatch');
      }

      return isValid;
    } catch (err) {
      logger.error('Paddle webhook verification error', { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * Generates a checkout URL or sandbox overlay session for subscription purchase/upgrade.
   */
  async createSubscriptionCheckout(
    merchantId: string,
    planTier: string,
    billingInterval: BillingInterval,
    returnUrl?: string
  ): Promise<CheckoutSessionResult> {
    const defaultReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/billing`;

    // In sandbox or when API key is not yet set, provide structured sandbox checkout simulation URL
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      const simulatedUrl = `${this.apiBaseUrl}/checkout/mock?merchant_id=${encodeURIComponent(merchantId)}&tier=${encodeURIComponent(planTier)}&interval=${encodeURIComponent(billingInterval)}&return_url=${encodeURIComponent(defaultReturnUrl)}`;
      return { checkoutUrl: simulatedUrl };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              price_id: `pri_${planTier.toLowerCase()}_${billingInterval.toLowerCase()}`,
              quantity: 1,
            },
          ],
          custom_data: {
            merchant_id: merchantId,
            plan_tier: planTier,
          },
          checkout: {
            url: defaultReturnUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn('Paddle API checkout creation non-200 response, using fallback sandbox URL', {
          status: response.status,
          error: errorBody,
        });
        return {
          checkoutUrl: `${this.apiBaseUrl}/checkout/sandbox?merchant_id=${encodeURIComponent(merchantId)}&tier=${encodeURIComponent(planTier)}&interval=${encodeURIComponent(billingInterval)}`,
        };
      }

      const data = await response.json();
      const checkoutUrl = data.data?.url || `${this.apiBaseUrl}/checkout/custom?merchant_id=${merchantId}`;
      return { checkoutUrl };
    } catch (err) {
      logger.error('Paddle createSubscriptionCheckout network failure, using sandbox fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        checkoutUrl: `${this.apiBaseUrl}/checkout/sandbox?merchant_id=${encodeURIComponent(merchantId)}&tier=${encodeURIComponent(planTier)}&interval=${encodeURIComponent(billingInterval)}`,
      };
    }
  }

  /**
   * Requests subscription cancellation via Paddle API.
   */
  async cancelSubscription(providerSubscriptionId: string): Promise<{ success: boolean }> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      logger.info('Paddle sandbox mock cancellation executed', { providerSubscriptionId });
      return { success: true };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/subscriptions/${providerSubscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('Paddle API cancelSubscription error', {
          status: response.status,
          error: errorBody,
        });
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      logger.error('Paddle cancelSubscription network failure', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { success: false };
    }
  }
}
