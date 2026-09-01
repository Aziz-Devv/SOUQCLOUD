'use client';

import { useState } from 'react';
import { cancelOrderAction } from '@/app/actions/order-management';

interface OrderCancelDialogProps {
  storeId: string;
  orderId: string;
  orderNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrderCancelDialog({
  storeId,
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: OrderCancelDialogProps) {
  const [reason, setReason] = useState('');
  const [restockInventory, setRestockInventory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('يرجى تحديد سبب الإلغاء');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await cancelOrderAction({
        storeId,
        orderId,
        reason: reason.trim(),
        restockInventory,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error.message || 'فشل إلغاء الطلب');
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع أثناء إلغاء الطلب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-surface border border-border-subtle rounded-card shadow-2xl max-w-md w-full p-6 space-y-5">
          <div className="flex items-start justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <span>⚠️</span> إلغاء الطلب #{orderNumber}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                سيتم تغيير حالة الطلب نهائياً إلى ملغي مع تسجيل سبب الإلغاء.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-sm p-1"
            >
              ✕
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCancelOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                سبب الإلغاء <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: طلب العميل الإلغاء / تعذر التواصل / نفاد الكمية..."
                className="w-full px-3 py-2 text-xs bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="restock"
                checked={restockInventory}
                onChange={(e) => setRestockInventory(e.target.checked)}
                className="rounded border-border-strong text-brand-primary focus:ring-brand-primary"
              />
              <label htmlFor="restock" className="text-xs font-medium text-text-primary cursor-pointer select-none">
                إعادة المنتجات إلى المخزون تلقائياً (Restock Inventory)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-surface hover:bg-background-secondary border border-border-subtle rounded-btn text-xs font-semibold text-text-secondary transition-colors"
              >
                تراجع
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-btn text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? 'جاري الإلغاء...' : 'تأكيد إلغاء الطلب'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
