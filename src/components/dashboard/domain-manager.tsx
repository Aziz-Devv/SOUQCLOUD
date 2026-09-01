'use client';

import React, { useState, useTransition } from 'react';
import { CustomDomainDetail } from '@/lib/domains/types';
import {
  attachCustomDomainAction,
  verifyCustomDomainAction,
  removeCustomDomainAction,
} from '@/app/actions/domains';

interface DomainManagerProps {
  storeId: string;
  storeHandle: string;
  initialDomain: CustomDomainDetail | null;
  userRole: string;
}

export function DomainManager({
  storeId,
  storeHandle,
  initialDomain,
  userRole,
}: DomainManagerProps) {
  const [domain, setDomain] = useState<CustomDomainDetail | null>(initialDomain);
  const [hostnameInput, setHostnameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isViewerOnly = userRole === 'STAFF';
  const subdomainUrl = `https://${storeHandle}.souqcloud.com`;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleAttachDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const rawHost = hostnameInput.trim().toLowerCase();
    if (!rawHost) {
      setFormError('يرجى إدخال اسم النطاق');
      return;
    }

    startTransition(async () => {
      const result = await attachCustomDomainAction({
        storeId,
        hostname: rawHost,
      });

      if (!result.success) {
        setFormError(result.error.message || 'فشل ربط النطاق المخصص');
        return;
      }

      setDomain(result.data);
      setHostnameInput('');
    });
  };

  const handleVerifyDomain = () => {
    if (!domain) return;
    setFormError(null);

    startTransition(async () => {
      const result = await verifyCustomDomainAction({
        storeId,
        domainId: domain.id,
      });

      if (!result.success) {
        setFormError(result.error.message || 'فشل التحقق من حالة النطاق');
        return;
      }

      setDomain(result.data);
    });
  };

  const handleRemoveDomain = () => {
    if (!domain) return;
    if (!window.confirm(`هل أنت متأكد من رغبتك في إزالة النطاق (${domain.hostname})؟`)) {
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await removeCustomDomainAction({
        storeId,
        domainId: domain.id,
      });

      if (!result.success) {
        setFormError(result.error.message || 'فشل إزالة النطاق المخصص');
        return;
      }

      setDomain(null);
    });
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* 1. Default Store Subdomain Card */}
      <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary">
              النطاق الافتراضي للمتجر
            </h2>
            <p className="text-xs text-text-secondary">
              هذا هو الرابط الأساسي المجاني لمتجرك على منصة سوق كلاود.
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            نشط دائماً
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-canvas border border-border-subtle rounded-input font-mono text-xs text-text-primary">
          <a
            href={subdomainUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-brand-primary"
          >
            {subdomainUrl}
          </a>
          <button
            type="button"
            onClick={() => copyToClipboard(subdomainUrl, 'subdomain')}
            className="px-2.5 py-1 text-xs font-sans rounded bg-surface hover:bg-surface-hover border border-border-subtle transition-colors"
          >
            {copiedKey === 'subdomain' ? 'تم النسخ ✓' : 'نسخ الرابط'}
          </button>
        </div>
      </div>

      {/* 2. Custom Domain Card */}
      <div className="p-6 bg-surface border border-border-subtle rounded-card shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary">
              النطاق المخصص (Custom Domain)
            </h2>
            <p className="text-xs text-text-secondary">
              اربط نطاقك الخاص (مثل shop.mybrand.com أو www.fashion.sa) مع شهادة SSL مجانية وتوجيه عالمي سريع.
            </p>
          </div>

          {domain && (
            <div>
              {domain.status === 'ACTIVE' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  🟢 نشط ومفعل (SSL جاهز)
                </span>
              )}
              {domain.status === 'PENDING_VERIFICATION' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  🟡 قيد التحقق من الـ DNS
                </span>
              )}
              {domain.status === 'FAILED' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  🔴 فشل التحقق
                </span>
              )}
            </div>
          )}
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-input text-xs">
            {formError}
          </div>
        )}

        {/* Form to attach new custom domain */}
        {!domain && (
          <form onSubmit={handleAttachDomain} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="hostname" className="block text-xs font-medium text-text-secondary">
                اسم النطاق المخصص
              </label>
              <div className="flex gap-2">
                <input
                  id="hostname"
                  type="text"
                  placeholder="مثال: shop.brand.com أو www.brand.sa"
                  value={hostnameInput}
                  onChange={(e) => setHostnameInput(e.target.value)}
                  disabled={isPending || isViewerOnly}
                  className="flex-1 px-3.5 py-2 bg-canvas border border-border-subtle rounded-input text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="submit"
                  disabled={isPending || isViewerOnly || !hostnameInput.trim()}
                  className="px-5 py-2 bg-brand-primary text-white text-xs font-medium rounded-input hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? 'جاري الربط...' : 'ربط النطاق'}
                </button>
              </div>
              <p className="text-[11px] text-text-muted">
                ملاحظة: النطاقات المدعومة هي النطاقات الفرعية (Subdomains) مثل shop.domain.com أو www.domain.com.
              </p>
            </div>
          </form>
        )}

        {/* Active / Pending Custom Domain Management View */}
        {domain && (
          <div className="space-y-6 pt-2">
            <div className="p-4 bg-canvas border border-border-subtle rounded-input flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono font-semibold text-text-primary">
                  {domain.hostname}
                </div>
                <div className="text-[11px] text-text-secondary">
                  {domain.status === 'ACTIVE'
                    ? 'النطاق يعمل بنجاح ويستقبل الزوار مع شهادة أمان SSL نشطة.'
                    : 'يرجى إضافة سجلات DNS الموضحة أدناه لدى مزود النطاق الخاص بك لإتمام التفعيل.'}
                </div>
              </div>

              {!isViewerOnly && (
                <button
                  type="button"
                  onClick={handleRemoveDomain}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                >
                  إزالة النطاق
                </button>
              )}
            </div>

            {/* DNS Instructions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-primary">
                  سجلات الـ DNS المطلوبة (DNS Configuration)
                </h3>
                {!isViewerOnly && (
                  <button
                    type="button"
                    onClick={handleVerifyDomain}
                    disabled={isPending}
                    className="px-3 py-1 bg-surface-hover hover:bg-surface border border-border-subtle text-xs font-medium rounded text-text-primary transition-colors flex items-center gap-1.5"
                  >
                    {isPending ? 'جاري التحقق...' : '🔄 التحقق من حالة النطاق'}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-border-subtle rounded-input">
                <table className="w-full text-right text-xs">
                  <thead className="bg-canvas border-b border-border-subtle text-text-secondary font-medium">
                    <tr>
                      <th className="p-3">النوع (Type)</th>
                      <th className="p-3">الاسم / المضيف (Name)</th>
                      <th className="p-3">القيمة / الهدف (Value)</th>
                      <th className="p-3 text-center">نسخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-text-primary font-mono text-[11px]">
                    {/* CNAME Routing Record */}
                    <tr>
                      <td className="p-3 font-sans font-bold text-brand-primary">CNAME</td>
                      <td className="p-3">{domain.dnsRecords.cname.name}</td>
                      <td className="p-3">{domain.dnsRecords.cname.target}</td>
                      <td className="p-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(domain.dnsRecords.cname.target, 'cname-target')}
                          className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border-subtle text-[10px]"
                        >
                          {copiedKey === 'cname-target' ? '✓' : 'نسخ'}
                        </button>
                      </td>
                    </tr>

                    {/* TXT Ownership Verification Record */}
                    {domain.dnsRecords.txt && (
                      <tr>
                        <td className="p-3 font-sans font-bold text-amber-500">TXT</td>
                        <td className="p-3">{domain.dnsRecords.txt.name}</td>
                        <td className="p-3 max-w-[200px] truncate">{domain.dnsRecords.txt.value}</td>
                        <td className="p-3 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(domain.dnsRecords.txt!.value, 'txt-value')}
                            className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border-subtle text-[10px]"
                          >
                            {copiedKey === 'txt-value' ? '✓' : 'نسخ'}
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {domain.errorMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-xs">
                  تنبيه تشخيصي: {domain.errorMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
