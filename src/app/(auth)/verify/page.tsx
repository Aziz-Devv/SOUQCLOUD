'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { verifyOtpAction } from '@/app/actions/auth';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(emailParam);
  const [token, setToken] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await verifyOtpAction({
        email,
        token,
        type: 'email', // Canonical Supabase contract
      });

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

      // Verification succeeded & authenticated session established
      router.push('/app/home');
      router.refresh();
    } catch {
      setError('حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">التحقق من البريد الإلكتروني</h1>
        <p className="text-sm text-text-secondary">
          أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 p-3 text-sm text-feedback-danger bg-red-50 border border-red-200 rounded-sm"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!emailParam ? (
          <Input
            id="verify-email"
            label="البريد الإلكتروني"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors['email']}
            disabled={isLoading}
          />
        ) : (
          <div className="p-2.5 bg-canvas border border-border-subtle rounded-sm text-xs text-text-secondary text-center">
            تم إرسال الرمز إلى: <strong className="text-text-primary">{email}</strong>
          </div>
        )}

        <Input
          id="verify-token"
          label="رمز التحقق (6 أرقام)"
          type="text"
          maxLength={6}
          required
          autoFocus
          className="text-center text-lg tracking-widest font-mono"
          placeholder="123456"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
          error={fieldErrors['token']}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          تأكيد الرمز والدخول
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border-subtle text-center text-sm text-text-secondary">
        لم يصلك الرمز؟{' '}
        <Link href="/register" className="text-brand-primary font-medium hover:underline">
          إعادة التسجيل
        </Link>
      </div>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense fallback={<Card className="w-full max-w-md mx-auto p-6 text-center text-sm text-text-muted">جاري التحميل...</Card>}>
      <VerifyOtpContent />
    </React.Suspense>
  );
}
