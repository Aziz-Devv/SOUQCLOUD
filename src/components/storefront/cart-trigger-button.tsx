'use client';

import { useCart } from './cart-provider';

export function CartTriggerButton() {
  const { cart, openCart } = useCart();
  const count = cart?.itemCount || 0;

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative p-2 text-text-primary hover:text-brand-primary transition-colors flex items-center gap-1.5"
      aria-label="عرض سلة المشتريات"
    >
      <span className="text-lg">🛒</span>
      <span className="hidden sm:inline text-xs font-bold">السلة</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold leading-none text-white bg-brand-primary rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}
