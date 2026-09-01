import { describe, it, expect } from 'vitest';
import { calculateLineItem, calculateOrderTotals } from '../src/lib/checkout/calculations';

describe('Commerce Calculations: Integer Arithmetic & Deterministic Tax (docs/03-modules/checkout.md)', () => {
  describe('Line Item Tax Calculations', () => {
    it('calculates zero tax when taxRateBasisPoints is 0', () => {
      const line = calculateLineItem(25000, 2, 0, false);
      expect(line.totalPriceCents).toBe(50000);
      expect(line.taxCents).toBe(0);
    });

    it('calculates tax-added model with rounding (15% VAT = 1500 bps)', () => {
      // 100.00 SAR * 1 = 100.00 SAR (10000 cents) -> 15% VAT = 1500 cents (15.00 SAR)
      const line = calculateLineItem(10000, 1, 1500, false);
      expect(line.totalPriceCents).toBe(10000);
      expect(line.taxCents).toBe(1500);
    });

    it('calculates tax-included model extracting tax from gross price (15% VAT = 1500 bps)', () => {
      // 115.00 SAR gross price (11500 cents) with 15% tax included -> tax = 1500 cents (15.00 SAR), net = 10000 cents (100.00 SAR)
      const line = calculateLineItem(11500, 1, 1500, true);
      expect(line.totalPriceCents).toBe(11500);
      expect(line.taxCents).toBe(1500);
    });

    it('correctly handles integer rounding half-up for odd fractional cents', () => {
      // 33.33 SAR * 1 = 3333 cents -> 15% = floor((3333 * 1500 + 5000) / 10000) = floor((4999500 + 5000) / 10000) = 500 cents
      const line = calculateLineItem(3333, 1, 1500, false);
      expect(line.taxCents).toBe(500);
    });
  });

  describe('Order Totals & Exact Tax Reconciliation', () => {
    it('enforces orders.tax_cents === sum(order_line_items.tax_cents) for multi-item cart', () => {
      const items = [
        { unitPriceCents: 10000, quantity: 2 }, // 200.00 SAR -> Tax: 30.00 SAR (3000 cents)
        { unitPriceCents: 5000, quantity: 3 },  // 150.00 SAR -> Tax: 22.50 SAR (2250 cents)
      ];

      const totals = calculateOrderTotals(
        items,
        { flatRateCents: 2000, freeShippingThresholdCents: null },
        1500, // 15% VAT
        false // Tax-added
      );

      expect(totals.subtotalCents).toBe(35000); // 350.00 SAR
      expect(totals.shippingCents).toBe(2000);   // 20.00 SAR
      expect(totals.taxCents).toBe(5250);        // 52.50 SAR (3000 + 2250)
      expect(totals.totalCents).toBe(42250);      // 422.50 SAR (35000 + 2000 + 5250)

      // Exact reconciliation check
      const sumLineTax = totals.items.reduce((sum, item) => sum + item.taxCents, 0);
      expect(totals.taxCents).toBe(sumLineTax);
    });

    it('applies free shipping threshold correctly when subtotal meets threshold', () => {
      const items = [{ unitPriceCents: 30000, quantity: 1 }]; // 300.00 SAR

      const totals = calculateOrderTotals(
        items,
        { flatRateCents: 2500, freeShippingThresholdCents: 20000 }, // Free over 200.00 SAR
        1500,
        true // Tax-included
      );

      expect(totals.subtotalCents).toBe(30000);
      expect(totals.shippingCents).toBe(0); // Free shipping qualified
      expect(totals.totalCents).toBe(30000); // Tax included in subtotal
    });

    it('charges flat rate shipping when subtotal is below threshold', () => {
      const items = [{ unitPriceCents: 15000, quantity: 1 }]; // 150.00 SAR

      const totals = calculateOrderTotals(
        items,
        { flatRateCents: 2500, freeShippingThresholdCents: 20000 },
        1500,
        true
      );

      expect(totals.subtotalCents).toBe(15000);
      expect(totals.shippingCents).toBe(2500);
      expect(totals.totalCents).toBe(17500);
    });
  });
});
