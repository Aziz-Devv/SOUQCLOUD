'use client';

import Link from 'next/link';
import { useCart } from './cart-provider';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeLine, isLoading } = useCart();

  if (!isOpen) return null;

  const lines = cart?.lines || [];
  const currency = cart?.currency || '';
  const subtotal = cart?.subtotalCents ? (cart.subtotalCents / 100).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-xs"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-10 sm:pl-0 sm:right-auto sm:left-0 sm:max-w-md w-full">
        <div className="w-full bg-surface shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-6 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛒</span>
              <h2 className="text-lg font-bold text-text-primary">سلة المشتريات</h2>
              <span className="text-xs bg-brand-subtle/30 text-brand-primary font-bold px-2 py-0.5 rounded-full">
                {cart?.itemCount || 0}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="p-2 text-text-muted hover:text-text-primary rounded-btn transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Drawer Body: Line Items */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <span className="text-4xl text-slate-300">🛍️</span>
                <p className="text-sm font-semibold text-text-primary">السلة فارغة حالياً</p>
                <p className="text-xs text-text-secondary">
                  تصفح المنتجات وأضف ما يعجبك لإتمام الطلب بسهولة.
                </p>
              </div>
            ) : (
              lines.map((line) => {
                const unitPrice = (line.priceCents / 100).toFixed(2);

                return (
                  <div
                    key={line.id}
                    className="p-3 bg-surface border border-border-subtle rounded-card flex gap-3 items-center"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-slate-100 rounded-sm border border-border-subtle overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {line.images.length > 0 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={line.images[0]}
                          alt={line.productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">صورة</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-bold text-text-primary truncate">
                        {line.productTitle}
                      </h4>
                      {line.variantTitle && (
                        <p className="text-[11px] text-text-secondary truncate">
                          {line.variantTitle}
                        </p>
                      )}
                      <div className="text-xs font-mono font-bold text-brand-primary">
                        {unitPrice} {currency}
                      </div>
                    </div>

                    {/* Quantity Stepper & Removal */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center border border-border-strong rounded-btn bg-surface">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateQuantity(line.id, line.quantity - 1)}
                          className="px-2 py-1 text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-xs font-mono font-bold text-text-primary">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateQuantity(line.id, line.quantity + 1)}
                          className="px-2 py-1 text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => removeLine(line.id)}
                        className="text-[11px] text-red-500 hover:text-red-700 underline"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer: Subtotal & Checkout CTA */}
          {lines.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-border-subtle bg-canvas space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-text-secondary">المجموع الفرعي:</span>
                <span className="font-mono font-bold text-base text-text-primary">
                  {subtotal} {currency}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                * تكلفة الشحن والضرائب يتم احتسابها بدقة في خطوة إتمام الطلب.
              </p>

              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="block w-full py-3 px-4 bg-brand-primary hover:bg-brand-hover text-white text-center font-bold text-sm rounded-btn shadow-md transition-all"
                >
                  إتمام الطلب
                </Link>
                <button
                  type="button"
                  onClick={closeCart}
                  className="block w-full py-2 text-center text-xs text-text-secondary hover:text-text-primary font-medium"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
