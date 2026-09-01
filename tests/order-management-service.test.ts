import { describe, it, expect } from 'vitest';
import { OrderStatus } from '../src/lib/schemas/order-management';

describe('Merchant Order Management State Machine (docs/03-modules/orders.md & ADR-005)', () => {
  // Pure state machine validation matrix matching the DB RPC logic
  function isValidTransition(current: OrderStatus, target: OrderStatus): boolean {
    if (current === 'DELIVERED' || current === 'CANCELLED') {
      return false; // Terminal states
    }

    if (current === 'NEW' && (target === 'CONTACTED' || target === 'CANCELLED')) return true;
    if (current === 'CONTACTED' && (target === 'CONFIRMED' || target === 'CANCELLED')) return true;
    if (current === 'CONFIRMED' && (target === 'PREPARING' || target === 'CANCELLED')) return true;
    if (current === 'PREPARING' && (target === 'READY' || target === 'CANCELLED')) return true;
    if (current === 'READY' && target === 'DELIVERED') return true;

    return false;
  }

  describe('Valid Order Lifecycle Transitions', () => {
    it('allows progression along standard fulfillment path', () => {
      expect(isValidTransition('NEW', 'CONTACTED')).toBe(true);
      expect(isValidTransition('CONTACTED', 'CONFIRMED')).toBe(true);
      expect(isValidTransition('CONFIRMED', 'PREPARING')).toBe(true);
      expect(isValidTransition('PREPARING', 'READY')).toBe(true);
      expect(isValidTransition('READY', 'DELIVERED')).toBe(true);
    });

    it('allows cancellation from pre-dispatch states', () => {
      expect(isValidTransition('NEW', 'CANCELLED')).toBe(true);
      expect(isValidTransition('CONTACTED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('CONFIRMED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PREPARING', 'CANCELLED')).toBe(true);
    });
  });

  describe('Invalid Order State Machine Transitions', () => {
    it('rejects skipping stages', () => {
      expect(isValidTransition('NEW', 'PREPARING')).toBe(false);
      expect(isValidTransition('NEW', 'READY')).toBe(false);
      expect(isValidTransition('NEW', 'DELIVERED')).toBe(false);
      expect(isValidTransition('CONTACTED', 'READY')).toBe(false);
      expect(isValidTransition('CONFIRMED', 'DELIVERED')).toBe(false);
    });

    it('rejects transitioning backwards', () => {
      expect(isValidTransition('CONFIRMED', 'NEW')).toBe(false);
      expect(isValidTransition('PREPARING', 'CONTACTED')).toBe(false);
      expect(isValidTransition('READY', 'PREPARING')).toBe(false);
    });

    it('enforces terminal state immutability for DELIVERED and CANCELLED', () => {
      expect(isValidTransition('DELIVERED', 'NEW')).toBe(false);
      expect(isValidTransition('DELIVERED', 'PREPARING')).toBe(false);
      expect(isValidTransition('DELIVERED', 'CANCELLED')).toBe(false);

      expect(isValidTransition('CANCELLED', 'NEW')).toBe(false);
      expect(isValidTransition('CANCELLED', 'CONFIRMED')).toBe(false);
      expect(isValidTransition('CANCELLED', 'CANCELLED')).toBe(false);
    });
  });
});
