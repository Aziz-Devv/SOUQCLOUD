'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { forgotPasswordAction } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await forgotPasswordAction({ email });

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

      setIsSubmitted(true);
      setIsLoading(false);
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">استعادة كلمة المرور</h1>
        <p className="text-sm text-text-secondary">
          أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm text-emerald-800 text-sm">
            إذا كان هذا البريد مسجلاً لدينا، فقد تم إرسال تعليمات استعادة كلمة المرور إليه.
          </div>
          <Link href="/login" className="block text-center text-sm text-brand-primary font-medium hover:underline">
            العودة لتسجيل الدخول
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
              id="forgot-email"
              label="البريد الإلكتروني"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors['email']}
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              إرسال رابط الاستعادة
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border-subtle text-center text-sm text-text-secondary">
            تذكرت كلمة المرور؟{' '}
            <Link href="/login" className="text-brand-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
