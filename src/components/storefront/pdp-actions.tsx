'use client';

import { useState } from 'react';
import { Variant } from '@/lib/types';
import { useCart } from './cart-provider';

interface PdpActionsProps {
  variants: Variant[];
  currency: string;
}

export function PdpActions({ variants, currency }: PdpActionsProps) {
  const { addToCart, isLoading } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];

  const inStock = selectedVariant
    ? selectedVariant.inventoryQuantity > 0 || selectedVariant.allowBackorder
    : false;

  const handleAdd = async () => {
    if (!selectedVariant || !inStock) return;
    await addToCart(selectedVariant.id, quantity);
  };

  return (
    <div className="space-y-6">
      {/* Price & Stock Display for Selected Variant */}
      <div className="space-y-2 border-b border-border-subtle pb-4">
        <div className="flex items-baseline gap-3 pt-1">
          <span className="text-2xl font-black font-mono text-brand-primary">
            {selectedVariant ? (selectedVariant.priceCents / 100).toFixed(2) : '0.00'}{' '}
            {currency}
          </span>
          {selectedVariant?.compareAtPriceCents && (
            <span className="text-base font-mono text-text-muted line-through">
              {(selectedVariant.compareAtPriceCents / 100).toFixed(2)} {currency}
            </span>
          )}
        </div>

        {/* Stock Badge */}
        <div className="pt-2">
          {inStock ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              ✓ متوفر في المخزون
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              ✕ نفدت الكمية
            </span>
          )}
        </div>
      </div>

      {/* Variants Selector */}
      {variants.length > 1 && (
        <div className="space-y-3 border-b border-border-subtle pb-4">
          <label className="block text-xs font-bold text-text-primary uppercase tracking-wider">
            الخيارات المتاحة ({variants.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSelected = v.id === selectedVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-btn border transition-colors ${
                    isSelected
                      ? 'border-brand-primary bg-sky-50 text-brand-primary font-bold'
                      : 'border-border-subtle bg-surface hover:border-border-strong text-text-primary'
                  }`}
                >
                  {v.title} — {(v.priceCents / 100).toFixed(2)} {currency}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity & Add to Cart CTA */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border-strong rounded-btn bg-surface">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              -
            </button>
            <span className="px-3 py-2 text-xs font-mono font-bold text-text-primary">
              {quantity}
            </span>
            <button
              type="button"
              disabled={
                !selectedVariant?.allowBackorder &&
                quantity >= (selectedVariant?.inventoryQuantity || 1)
              }
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-2 text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={!inStock || isLoading}
            onClick={handleAdd}
            className="flex-1 py-3 px-6 bg-brand-primary hover:bg-brand-hover text-white font-bold text-sm rounded-btn shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الإضافة...' : inStock ? 'إضافة إلى السلة' : 'نفدت الكمية'}
          </button>
        </div>
      </div>
    </div>
  );
}
