'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signInAction } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await signInAction({ email, password });

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

      // Successful sign in
      router.push('/app/home');
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">تسجيل الدخول</h1>
        <p className="text-sm text-text-secondary">
          أدخل بيانات حسابك للوصول إلى لوحة تحكم متجرك
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
        <Input
          id="login-email"
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Link
              href="/forgot-password"
              className="text-xs text-brand-primary hover:underline"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          <Input
            id="login-password"
            label="كلمة المرور"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors['password']}
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          دخول
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border-subtle text-center text-sm text-text-secondary">
        ليس لديك حساب بعد؟{' '}
        <Link href="/register" className="text-brand-primary font-medium hover:underline">
          إنشاء حساب جديد
        </Link>
      </div>
    </Card>
  );
}
