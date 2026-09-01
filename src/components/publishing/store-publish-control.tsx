'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StoreStatus } from '@/lib/types';
import {
  publishStoreAction,
  unpublishStoreAction,
  updateStoreStatusAction,
} from '@/app/actions/publishing';

interface StorePublishControlProps {
  storeId: string;
  storeName: string;
  handle: string;
  customDomain?: string | null;
  initialStatus: StoreStatus;
}

export function StorePublishControl({
  storeId,
  storeName,
  handle,
  customDomain,
  initialStatus,
}: StorePublishControlProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<StoreStatus>(initialStatus);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const liveDomain = customDomain || `${handle}.souqcloud.com`;
  const liveUrl = `https://${liveDomain}`;

  const handlePublish = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await publishStoreAction({ storeId });
      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setStatus(result.data.status);
      setSuccessMsg('تم نشر المتجر بنجاح! أصبح متاحاً الآن للمتسوقين.');
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع أثناء نشر المتجر.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('هل أنت متأكد من إلغاء نشر المتجر؟ سيتم حجب المتجر عن المتسوقين والزوار.')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await unpublishStoreAction({ storeId });
      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setStatus(result.data.status);
      setSuccessMsg('تم إلغاء نشر المتجر بنجاح وإعادته إلى وضع المسودة.');
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع أثناء إلغاء نشر المتجر.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: StoreStatus) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await updateStoreStatusAction({ storeId, status: newStatus });
      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setStatus(result.data.status);
      setSuccessMsg(`تم تحديث حالة المتجر إلى: ${newStatus}`);
      router.refresh();
    } catch {
      setError('حدث خطأ أثناء تحديث حالة المتجر.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-4 border border-border-strong p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-primary">حالة نشر المتجر ({storeName})</h3>
            {status === 'PUBLISHED' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                ● منشور ونشط للعملاء
              </span>
            )}
            {status === 'DRAFT' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                ● مسودة (مخفي عن العملاء)
              </span>
            )}
            {status === 'MAINTENANCE' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
                ● وضع الصيانة
              </span>
            )}
            {status === 'ARCHIVED' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                ● مؤرشف
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            التحكم في ظهور المتجر وصفحاته ومنتجاته للزوار والمتسوقين عبر الإنترنت.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'PUBLISHED' ? (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              onClick={handleUnpublish}
              className="text-xs text-feedback-danger hover:bg-red-50"
            >
              إلغاء النشر (مسودة)
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={handlePublish}
              className="text-xs"
            >
              نشر المتجر الآن
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2.5 text-xs text-feedback-danger bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
          {successMsg}
        </div>
      )}

      {status === 'PUBLISHED' && (
        <div className="p-3 bg-sky-50/50 border border-sky-200 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-text-secondary font-medium">رابط المتجر المباشر:</span>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-brand-primary font-bold hover:underline truncate"
              dir="ltr"
            >
              {liveUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(liveUrl);
              setSuccessMsg('تم نسخ رابط المتجر إلى الحافظة.');
            }}
            className="text-xs text-brand-primary font-semibold hover:underline"
          >
            نسخ الرابط
          </button>
        </div>
      )}

      <div className="pt-2 flex items-center justify-between text-xs text-text-secondary">
        <span>تغيير الحالة المتقدم:</span>
        <div className="flex items-center gap-1.5">
          {(['DRAFT', 'PUBLISHED', 'MAINTENANCE', 'ARCHIVED'] as StoreStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              disabled={status === st || isLoading}
              onClick={() => handleStatusChange(st)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                status === st
                  ? 'bg-slate-200 text-slate-800 font-bold cursor-default'
                  : 'bg-surface hover:bg-background-secondary text-text-muted hover:text-text-primary border border-border-subtle'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
