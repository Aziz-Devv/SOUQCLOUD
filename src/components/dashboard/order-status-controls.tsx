'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderStatus } from '@/lib/schemas/order-management';
import {
  updateOrderStatusAction,
  updateOrderNotesAction,
} from '@/app/actions/order-management';
import { OrderCancelDialog } from './order-cancel-dialog';

interface OrderStatusControlsProps {
  storeId: string;
  orderId: string;
  orderNumber: number;
  currentStatus: OrderStatus;
  merchantNotes: string | null;
}

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: 'NEW', label: '1. جديد (NEW)' },
  { value: 'CONTACTED', label: '2. تم التواصل (CONTACTED)' },
  { value: 'CONFIRMED', label: '3. مؤكد (CONFIRMED)' },
  { value: 'PREPARING', label: '4. جاري التجهيز (PREPARING)' },
  { value: 'READY', label: '5. جاهز للتسليم (READY)' },
  { value: 'DELIVERED', label: '6. تم التوصيل (DELIVERED)' },
];

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: 'CONTACTED',
  CONTACTED: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

export function OrderStatusControls({
  storeId,
  orderId,
  orderNumber,
  currentStatus,
  merchantNotes: initialNotes,
}: OrderStatusControlsProps) {
  const router = useRouter();

  const [notes, setNotes] = useState(initialNotes || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const nextStatus = nextStatusMap[currentStatus];
  const isTerminal = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED';

  const handleAdvanceStatus = async (targetStatus?: OrderStatus) => {
    const statusToSet = targetStatus || nextStatus;
    if (!statusToSet || isTerminal) return;

    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const res = await updateOrderStatusAction({
        storeId,
        orderId,
        newStatus: statusToSet,
        merchantNotes: notes.trim() || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'تم تحديث حالة الطلب بنجاح' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.error.message || 'فشل تحديث حالة الطلب' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء تحديث الحالة' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setFeedback(null);

    try {
      const res = await updateOrderNotesAction({
        storeId,
        orderId,
        merchantNotes: notes.trim(),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'تم حفظ ملاحظات التاجر بنجاح' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.error.message || 'فشل حفظ الملاحظات' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء حفظ الملاحظات' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3 rounded text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Status Transition Card */}
      <div className="p-5 bg-surface border border-border-subtle rounded-card shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          إدارة حالة الطلب
        </h3>

        {!isTerminal ? (
          <div className="space-y-3">
            {nextStatus && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleAdvanceStatus(nextStatus)}
                className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold rounded-btn shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>الانتقال للمرحلة التالية:</span>
                <span className="underline">
                  {statusOptions.find((o) => o.value === nextStatus)?.label}
                </span>
              </button>
            )}

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-text-muted">أو تغيير الحالة يدوياً:</span>
              <select
                disabled={isUpdatingStatus}
                value={currentStatus}
                onChange={(e) => handleAdvanceStatus(e.target.value as OrderStatus)}
                className="text-xs bg-surface border border-border-strong rounded-btn px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-brand-primary"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === currentStatus}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-border-subtle text-left">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 underline"
              >
                إلغاء الطلب...
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-muted">
            الطلب في حالة نهائية ({currentStatus}) ولا يمكن إجراء تعديلات إضافية على حالته.
          </div>
        )}
      </div>

      {/* Merchant Internal Notes Card */}
      <div className="p-5 bg-surface border border-border-subtle rounded-card shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          ملاحظات التاجر الداخلية (خاصة بالفريق)
        </h3>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أضف أي ملاحظات خاصة بالتوصيل، الاتفاق مع العميل، رقم الشحنة..."
          className="w-full px-3 py-2 text-xs bg-surface border border-border-strong rounded-btn text-text-primary focus:outline-none focus:border-brand-primary resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSavingNotes}
            onClick={handleSaveNotes}
            className="px-3.5 py-1.5 bg-surface hover:bg-background-secondary border border-border-subtle rounded-btn text-xs font-bold text-text-primary transition-colors disabled:opacity-50"
          >
            {isSavingNotes ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
          </button>
        </div>
      </div>

      {/* Cancellation Dialog Modal */}
      <OrderCancelDialog
        storeId={storeId}
        orderId={orderId}
        orderNumber={orderNumber}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
