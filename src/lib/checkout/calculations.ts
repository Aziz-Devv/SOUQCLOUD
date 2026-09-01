/**
 * Deterministic Integer Monetary & Tax Calculation Engine
 * Source of Truth: docs/03-modules/checkout.md & docs/00-product/phase-1-scope.md
 * 
 * Rules:
 * 1. Integer arithmetic: All values in integer currency cents (BIGINT); tax rates in basis points (1% = 100 bps).
 * 2. Tax-Added: line_tax = floor((line_total * rate + 5000) / 10000)
 * 3. Tax-Included: line_tax = line_total - floor((line_total * 10000 + floor((10000 + rate)/2)) / (10000 + rate))
 * 4. Total Reconciliation: orders.tax_cents === sum(order_line_items.tax_cents)
 */

export interface LineItemForCalculation {
  unitPriceCents: number;
  quantity: number;
}

export interface ShippingSettingsForCalculation {
  flatRateCents?: number;
  freeShippingThresholdCents?: number | null;
}

export interface CalculatedLineItem {
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
  taxCents: number;
}

export interface CalculatedOrderTotals {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  items: CalculatedLineItem[];
}

/**
 * Calculates line item total and tax cents using exact integer formulas.
 */
export function calculateLineItem(
  unitPriceCents: number,
  quantity: number,
  taxRateBasisPoints: number = 0,
  taxIncluded: boolean = false
): CalculatedLineItem {
  const totalPriceCents = Math.max(0, unitPriceCents * quantity);
  let taxCents = 0;

  if (taxRateBasisPoints > 0) {
    if (taxIncluded) {
      // Tax extracted from gross price
      // line_tax = total - floor((total * 10000 + floor((10000 + rate)/2)) / (10000 + rate))
      const numerator = totalPriceCents * 10000 + Math.floor((10000 + taxRateBasisPoints) / 2);
      const denominator = 10000 + taxRateBasisPoints;
      taxCents = totalPriceCents - Math.floor(numerator / denominator);
    } else {
      // Tax added on top of net price
      // line_tax = floor((total * rate + 5000) / 10000)
      taxCents = Math.floor((totalPriceCents * taxRateBasisPoints + 5000) / 10000);
    }
  }

  return {
    unitPriceCents,
    quantity,
    totalPriceCents,
    taxCents: Math.max(0, taxCents),
  };
}

/**
 * Calculates complete order totals with deterministic tax and shipping reconciliation.
 */
export function calculateOrderTotals(
  items: LineItemForCalculation[],
  shippingSettings?: ShippingSettingsForCalculation,
  taxRateBasisPoints: number = 0,
  taxIncluded: boolean = false
): CalculatedOrderTotals {
  const calculatedItems = items.map((item) =>
    calculateLineItem(item.unitPriceCents, item.quantity, taxRateBasisPoints, taxIncluded)
  );

  const subtotalCents = calculatedItems.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const taxCents = calculatedItems.reduce((sum, item) => sum + item.taxCents, 0);

  let shippingCents = 0;
  const flatRate = shippingSettings?.flatRateCents ?? 0;
  const freeThreshold = shippingSettings?.freeShippingThresholdCents;

  if (freeThreshold !== null && freeThreshold !== undefined && subtotalCents >= freeThreshold) {
    shippingCents = 0;
  } else {
    shippingCents = Math.max(0, flatRate);
  }

  const discountCents = 0; // Phase 1: discounts out of scope

  let totalCents = 0;
  if (taxIncluded) {
    totalCents = subtotalCents + shippingCents - discountCents;
  } else {
    totalCents = subtotalCents + shippingCents + taxCents - discountCents;
  }

  return {
    subtotalCents,
    taxCents,
    shippingCents,
    discountCents,
    totalCents: Math.max(0, totalCents),
    items: calculatedItems,
  };
}
