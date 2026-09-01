import { logger } from '@/lib/logger';
import {
  EmailMessage,
  EmailProviderAdapter,
  EmailProviderResult,
} from './types';

/**
 * Standard Transactional Email Provider Adapter.
 * Dispatches emails via configured HTTP/SMTP provider or logs structured output in dev/test.
 */
export class DefaultEmailProviderAdapter implements EmailProviderAdapter {
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'SouqCloud <no-reply@souqcloud.com>';
  }

  async sendEmail(message: EmailMessage): Promise<EmailProviderResult> {
    const fromAddress = message.from || this.defaultFrom;

    // Check if an external provider key (e.g. RESEND_API_KEY) is configured
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn('Resend email dispatch error response', {
            status: response.status,
            error: errorText,
            to: message.to,
            subject: message.subject,
          });
          return {
            success: false,
            error: `Resend API Error (${response.status}): ${errorText}`,
          };
        }

        const data = (await response.json()) as { id?: string };
        logger.info('Email dispatched successfully via Resend', {
          to: message.to,
          subject: message.subject,
          id: data.id,
        });

        return {
          success: true,
          messageId: data.id || `resend-${Date.now()}`,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
        logger.error('Failed to send email via Resend API', {
          to: message.to,
          subject: message.subject,
          error: errorMsg,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    }

    // Default Fallback: Structured Dev/Test Logger Provider
    const simulatedMessageId = `mock-${crypto.randomUUID()}`;
    logger.info('Transactional email dispatched via default adapter (dev/test logger)', {
      to: message.to,
      from: fromAddress,
      subject: message.subject,
      messageId: simulatedMessageId,
      textPreview: message.text.slice(0, 150),
    });

    return {
      success: true,
      messageId: simulatedMessageId,
    };
  }
}

export const defaultEmailProvider = new DefaultEmailProviderAdapter();
