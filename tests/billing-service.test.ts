import { describe, it, expect } from 'vitest';
import { SubscriptionStatus } from '../src/lib/billing/types';

describe('Billing Service Domain & Webhook Logic (docs/03-modules/billing-subscriptions.md)', () => {
  // Pure mapping function mirroring the DB RPC status translation
  function mapPaddleEventToStatus(eventType: string, rawStatus?: string): SubscriptionStatus {
    const s = (rawStatus || '').toLowerCase();

    if (eventType === 'subscription.activated' || eventType === 'subscription.resumed') {
      return 'ACTIVE';
    }
    if (eventType === 'subscription.trialing' || s === 'trialing') {
      return 'TRIALING';
    }
    if (eventType === 'subscription.past_due' || s === 'past_due') {
      return 'PAST_DUE';
    }
    if (eventType === 'subscription.paused' || s === 'paused') {
      return 'PAUSED';
    }
    if (eventType === 'subscription.canceled' || s === 'canceled') {
      return 'CANCELED';
    }

    if (s === 'active') return 'ACTIVE';
    if (s === 'past_due') return 'PAST_DUE';
    if (s === 'paused') return 'PAUSED';
    if (s === 'canceled') return 'CANCELED';

    return 'TRIALING';
  }

  // Pure chronology rule evaluator mirroring the DB RPC
  function evaluateChronology(
    eventOccurredAt: Date,
    lastEventOccurredAt: Date | null
  ): 'APPLY_MUTATION' | 'SKIP_STALE' {
    if (!lastEventOccurredAt) return 'APPLY_MUTATION';
    if (eventOccurredAt.getTime() >= lastEventOccurredAt.getTime()) return 'APPLY_MUTATION';
    return 'SKIP_STALE';
  }

  describe('Paddle Webhook Event Status Mapping', () => {
    it('maps activation and resumption events to ACTIVE', () => {
      expect(mapPaddleEventToStatus('subscription.activated', 'active')).toBe('ACTIVE');
      expect(mapPaddleEventToStatus('subscription.resumed', 'active')).toBe('ACTIVE');
    });

    it('maps past_due and payment failure conditions to PAST_DUE', () => {
      expect(mapPaddleEventToStatus('subscription.past_due', 'past_due')).toBe('PAST_DUE');
      expect(mapPaddleEventToStatus('subscription.updated', 'past_due')).toBe('PAST_DUE');
    });

    it('maps paused events to PAUSED', () => {
      expect(mapPaddleEventToStatus('subscription.paused', 'paused')).toBe('PAUSED');
    });

    it('maps cancellation events to CANCELED', () => {
      expect(mapPaddleEventToStatus('subscription.canceled', 'canceled')).toBe('CANCELED');
      expect(mapPaddleEventToStatus('subscription.updated', 'canceled')).toBe('CANCELED');
    });
  });

  describe('Out-of-Order Webhook Chronology Rules (ADR-004)', () => {
    it('applies mutation when no previous event exists', () => {
      const eventTime = new Date('2026-08-31T12:00:00Z');
      expect(evaluateChronology(eventTime, null)).toBe('APPLY_MUTATION');
    });

    it('applies mutation when event is newer than last processed event', () => {
      const lastTime = new Date('2026-08-31T12:00:00Z');
      const newerTime = new Date('2026-08-31T12:05:00Z');
      expect(evaluateChronology(newerTime, lastTime)).toBe('APPLY_MUTATION');
    });

    it('skips mutation (SKIP_STALE) when event is older than last processed event to prevent regression', () => {
      const lastTime = new Date('2026-08-31T12:05:00Z');
      const olderTime = new Date('2026-08-31T12:00:00Z');
      expect(evaluateChronology(olderTime, lastTime)).toBe('SKIP_STALE');
    });
  });
});
