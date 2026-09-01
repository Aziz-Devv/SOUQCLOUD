'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { activateThemeAction } from '@/app/actions/theme';
import { ThemeSummary } from '@/lib/types';
import { THEME_TEMPLATES } from '@/lib/theme-engine/tokens';

import Link from 'next/link';

interface ThemeSwitcherCardProps {
  theme: ThemeSummary;
  storeId: string;
}

export function ThemeSwitcherCard({ theme, storeId }: ThemeSwitcherCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const templateInfo = THEME_TEMPLATES[theme.themeTemplateId as keyof typeof THEME_TEMPLATES] || {
    name: theme.name,
    description: 'قالب تجارة إلكترونية معتمد في منصة سوق كلاود.',
  };

  const handleActivate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await activateThemeAction({
        themeId: theme.id,
        storeId,
      });

      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError('حدث خطأ أثناء تفعيل القالب.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`space-y-4 ${theme.isActive ? 'border-2 border-brand-primary bg-sky-50/20' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-text-primary">{templateInfo.name}</h3>
            {theme.isActive && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                القالب النشط حالياً
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1 max-w-md">
            {templateInfo.description}
          </p>
        </div>

        <div className="text-xs font-mono text-text-muted">
          {theme.themeTemplateId}
        </div>
      </div>

      {error && (
        <div className="p-2 text-xs text-feedback-danger bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-muted">
          تاريخ الإضافة: {new Date(theme.createdAt).toLocaleDateString('ar-SA')}
        </span>

        <div className="flex items-center gap-2">
          {theme.isActive ? (
            <Link href={`/app/online-store/themes/${theme.id}/editor`}>
              <Button variant="primary" size="sm">
                تخصيص القالب (Visual Customizer)
              </Button>
            </Link>
          ) : (
            <>
              <Link href={`/app/online-store/themes/${theme.id}/editor`}>
                <Button variant="ghost" size="sm" className="text-xs text-brand-primary">
                  معاينة وتخصيص
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                isLoading={isLoading}
                onClick={handleActivate}
              >
                تفعيل هذا القالب
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
