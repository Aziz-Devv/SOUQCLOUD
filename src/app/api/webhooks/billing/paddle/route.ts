import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent } from '@/lib/services/billing-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('Paddle-Signature') || req.headers.get('paddle-signature');

    if (!rawBody || !signatureHeader) {
      logger.warn('Paddle webhook rejected: Missing raw body or Paddle-Signature header');
      return NextResponse.json(
        { error: 'Missing body or Paddle-Signature header' },
        { status: 400 }
      );
    }

    const result = await processWebhookEvent(rawBody, signatureHeader);

    return NextResponse.json({
      received: true,
      status: result.status,
      event_id: result.event_id,
      reason: result.reason,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Paddle webhook endpoint processing error', { error: message });

    if (message.includes('Invalid Webhook Signature') || message.includes('توقيع إشعار Paddle')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    );
  }
}
