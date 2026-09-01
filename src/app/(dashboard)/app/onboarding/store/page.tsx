'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { checkHandleAction, createStoreAction } from '@/app/actions/store';

const COUNTRIES = [
  { code: 'SA', name: 'المملكة العربية السعودية (+966)', currency: 'SAR' },
  { code: 'AE', name: 'الإمارات العربية المتحدة (+971)', currency: 'AED' },
  { code: 'KW', name: 'الكويت (+965)', currency: 'KWD' },
  { code: 'QA', name: 'قطر (+974)', currency: 'QAR' },
  { code: 'BH', name: 'البحرين (+973)', currency: 'BHD' },
  { code: 'OM', name: 'سلطنة عمان (+968)', currency: 'OMR' },
  { code: 'EG', name: 'مصر (+20)', currency: 'EGP' },
  { code: 'JO', name: 'الأردن (+962)', currency: 'JOD' },
  { code: 'IQ', name: 'العراق (+964)', currency: 'IQD' },
];

export default function StoreOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('SA');
  const [currency, setCurrency] = React.useState('SAR');
  const [locale, setLocale] = React.useState<'ar' | 'en'>('ar');
  const [orderMode, setOrderMode] = React.useState<'DASHBOARD' | 'WHATSAPP' | 'BOTH'>('BOTH');
  const [whatsappPhone, setWhatsappPhone] = React.useState('');

  // Handle Availability State
  const [isCheckingHandle, setIsCheckingHandle] = React.useState(false);
  const [handleStatus, setHandleStatus] = React.useState<{
    checked: boolean;
    available: boolean;
    message?: string;
  }>({ checked: false, available: false });

  // Submission State
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Debounced Handle Availability Check
  React.useEffect(() => {
    const trimmed = handle.trim().toLowerCase();
    if (trimmed.length < 3) {
      setHandleStatus({ checked: false, available: false });
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingHandle(true);
      try {
        const res = await checkHandleAction({ handle: trimmed });
        if (res.success) {
          setHandleStatus({
            checked: true,
            available: res.data.available,
            message: res.data.available
              ? 'معرّف المتجر متاح للاستخدام!'
              : res.data.reason || 'المعرّف غير متاح',
          });
        } else {
          setHandleStatus({
            checked: true,
            available: false,
            message: res.error.message,
          });
        }
      } catch {
        setHandleStatus({ checked: false, available: false });
      } finally {
        setIsCheckingHandle(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [handle]);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      setCurrency(country.currency);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (step === 1) {
      if (name.trim().length < 2) {
        setFieldErrors({ name: 'اسم المتجر يجب أن يحتوي على حرفين على الأقل' });
        return;
      }
      if (handle.trim().length < 3) {
        setFieldErrors({ handle: 'معرّف المتجر يجب أن يحتوي على 3 أحرف على الأقل' });
        return;
      }
      if (handleStatus.checked && !handleStatus.available) {
        setFieldErrors({ handle: handleStatus.message || 'المعرّف غير متاح' });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await createStoreAction({
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        defaultCountryCode: countryCode,
        currency,
        defaultLocale: locale,
        orderMode,
        whatsappPhone: whatsappPhone.trim() || undefined,
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

      router.push('/app/home');
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع أثناء إنشاء المتجر.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">إنشاء متجرك الأول</h1>
        <p className="text-sm text-text-secondary mt-1">
          أكمل خطوات الإعداد البسيطة لبدء استقبال الطلبات
        </p>

        {/* Wizard Stepper Indicator */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-brand-primary text-white' : 'bg-background-tertiary text-text-muted'
            }`}
          >
            1
          </div>
          <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-brand-primary' : 'bg-border-subtle'}`} />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-brand-primary text-white' : 'bg-background-tertiary text-text-muted'
            }`}
          >
            2
          </div>
          <div className={`h-1 w-12 rounded ${step >= 3 ? 'bg-brand-primary' : 'bg-border-subtle'}`} />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-brand-primary text-white' : 'bg-background-tertiary text-text-muted'
            }`}
          >
            3
          </div>
        </div>
      </div>

      <Card>
        {error ? (
          <div
            role="alert"
            className="mb-6 p-3 text-sm text-feedback-danger bg-red-50 border border-red-200 rounded-sm"
          >
            {error}
          </div>
        ) : null}

        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              الخطوة 1: الهوية ورابط المتجر
            </h2>

            <Input
              id="store-name"
              label="اسم المتجر / العلامة التجارية"
              required
              placeholder="مثال: متجر الهدايا الفاخرة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors['name']}
            />

            <div>
              <Input
                id="store-handle"
                label="معرّف المتجر (رابط المتجر الفرعي)"
                required
                placeholder="مثال: luxury-gifts"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                error={fieldErrors['handle']}
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  رابطك سيكون: <strong dir="ltr">{handle.trim() || 'your-store'}.souqcloud.com</strong>
                </span>
                {isCheckingHandle ? (
                  <span className="text-brand-primary">جاري التحقق من التوفر...</span>
                ) : handleStatus.checked ? (
                  <span
                    className={
                      handleStatus.available
                        ? 'text-feedback-success font-medium'
                        : 'text-feedback-danger font-medium'
                    }
                  >
                    {handleStatus.message}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                التالي: الإعدادات الإقليمية &larr;
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNextStep} className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              الخطوة 2: الدولة والعملة
            </h2>

            <div>
              <label htmlFor="country-select" className="block text-sm font-medium text-text-primary mb-1">
                الدولة الرئيسية للعمليات
              </label>
              <select
                id="country-select"
                className="w-full h-10 px-3 border border-border-strong rounded-sm bg-background-primary text-text-primary text-sm focus:outline-none focus:border-brand-primary"
                value={countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="currency-select" className="block text-sm font-medium text-text-primary mb-1">
                  عملة المتجر
                </label>
                <input
                  id="currency-select"
                  type="text"
                  readOnly
                  className="w-full h-10 px-3 border border-border-subtle rounded-sm bg-background-secondary text-text-secondary text-sm"
                  value={currency}
                />
              </div>

              <div>
                <label htmlFor="locale-select" className="block text-sm font-medium text-text-primary mb-1">
                  اللغة الافتراضية
                </label>
                <select
                  id="locale-select"
                  className="w-full h-10 px-3 border border-border-strong rounded-sm bg-background-primary text-text-primary text-sm focus:outline-none focus:border-brand-primary"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'ar' | 'en')}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setStep(1)}
              >
                &rarr; السابق
              </Button>
              <Button type="submit" variant="primary" size="md">
                التالي: طريقة الطلب &larr;
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              الخطوة 3: استقبال الطلبات وخدمة العملاء
            </h2>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                طريقة استلام الطلبات من العملاء
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderMode('BOTH')}
                  className={`p-3 border rounded-sm text-center text-sm font-medium transition-colors ${
                    orderMode === 'BOTH'
                      ? 'border-brand-primary bg-blue-50 text-brand-primary'
                      : 'border-border-strong text-text-secondary hover:border-border-strong'
                  }`}
                >
                  لوحة التحكم والواتساب
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode('WHATSAPP')}
                  className={`p-3 border rounded-sm text-center text-sm font-medium transition-colors ${
                    orderMode === 'WHATSAPP'
                      ? 'border-brand-primary bg-blue-50 text-brand-primary'
                      : 'border-border-strong text-text-secondary hover:border-border-strong'
                  }`}
                >
                  واتساب فقط
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode('DASHBOARD')}
                  className={`p-3 border rounded-sm text-center text-sm font-medium transition-colors ${
                    orderMode === 'DASHBOARD'
                      ? 'border-brand-primary bg-blue-50 text-brand-primary'
                      : 'border-border-strong text-text-secondary hover:border-border-strong'
                  }`}
                >
                  لوحة التحكم فقط
                </button>
              </div>
            </div>

            {(orderMode === 'WHATSAPP' || orderMode === 'BOTH') && (
              <Input
                id="whatsapp-phone"
                label="رقم هاتف الواتساب لاستقبال الطلبات"
                required
                placeholder="مثال: 0501234567 أو +966501234567"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                error={fieldErrors['whatsappPhone']}
                disabled={isLoading}
              />
            )}

            <div className="p-3 bg-background-secondary border border-border-subtle rounded-sm text-xs text-text-secondary">
              سيتم إنشاء المتجر في حالة مسودة (DRAFT) وتجهيز إعدادات المتجر تلقائياً.
            </div>

            <div className="pt-4 flex justify-between">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setStep(2)}
                disabled={isLoading}
              >
                &rarr; السابق
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
              >
                إنشاء وتأكيد المتجر
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
