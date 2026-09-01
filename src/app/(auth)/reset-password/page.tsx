'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { updatePasswordAction } from '@/app/actions/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'كلمتا المرور غير متطابقتين' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePasswordAction({ password });

      if (!result.success) {
        if (result.error.details && result.error.details.length > 0) {
          const errors: Record<string, string> = {};
          result.error.details.forEach((d) => {
            if (d.field) errors[d.field] = d.issue;
          });
          setFieldErrors(errors);
        } else {
          setError(result.error.message);
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('حدث خطأ غير متوقع أثناء تحديث كلمة المرور.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">تعيين كلمة المرور الجديدة</h1>
        <p className="text-sm text-text-secondary">
          أدخل كلمة المرور الجديدة لحسابك
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm text-emerald-800 text-sm text-center">
            تم تحديث كلمة المرور بنجاح! جاري تحويلك لتسجيل الدخول...
          </div>
          <Link
            href="/login"
            className="block text-center text-sm text-brand-primary font-medium hover:underline"
          >
            الانتقال لتسجيل الدخول الآن
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div
              role="alert"
              className="mb-4 p-3 text-sm text-feedback-danger bg-red-50 border border-red-200 rounded-sm"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password"
              label="كلمة المرور الجديدة"
              type="password"
              autoComplete="new-password"
              required
              placeholder="8 أحرف على الأقل تشمل أرقام وأحرف"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors['password']}
              disabled={isLoading}
            />

            <Input
              id="confirm-password"
              label="تأكيد كلمة المرور الجديدة"
              type="password"
              autoComplete="new-password"
              required
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors['confirmPassword']}
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              حفظ كلمة المرور والدخول
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border-subtle text-center text-sm text-text-secondary">
            العودة إلى{' '}
            <Link href="/login" className="text-brand-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
