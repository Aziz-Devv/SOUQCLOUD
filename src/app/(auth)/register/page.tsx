'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signUpAction } from '@/app/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [organizationName, setOrganizationName] = React.useState('');
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
      const result = await signUpAction({
        fullName,
        organizationName,
        email,
        password,
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

      if (result.data.requiresEmailVerification) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/app/home');
      }
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">إنشاء حساب تاجر</h1>
        <p className="text-sm text-text-secondary">
          ابدأ تجارتك الإلكترونية مع SOUQCLOUD خلال دقائق
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
          id="register-fullname"
          label="الاسم الكامل"
          type="text"
          autoComplete="name"
          required
          placeholder="مثال: عبد العزيز الأحمد"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={fieldErrors['fullName']}
          disabled={isLoading}
        />

        <Input
          id="register-orgname"
          label="اسم النشاط التجاري / العلامة التجارية"
          type="text"
          required
          placeholder="مثال: متجر الأناقة"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          error={fieldErrors['organizationName']}
          disabled={isLoading}
        />

        <Input
          id="register-email"
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

        <Input
          id="register-password"
          label="كلمة المرور"
          type="password"
          autoComplete="new-password"
          required
          placeholder="8 أحرف على الأقل تشمل أرقام وأحرف"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors['password']}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          إنشاء الحساب
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border-subtle text-center text-sm text-text-secondary">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="text-brand-primary font-medium hover:underline">
          تسجيل الدخول
        </Link>
      </div>
    </Card>
  );
}
