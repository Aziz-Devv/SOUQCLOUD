'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createProductAction } from '@/app/actions/product';
import { ProductOption, CreateVariantInput } from '@/lib/types';
import { MediaPickerModal } from '@/components/dashboard/media-picker-modal';

interface ProductCreateFormProps {
  storeId: string;
  currency: string;
}

export function ProductCreateForm({ storeId, currency }: ProductCreateFormProps) {
  const router = useRouter();

  // Basic Details
  const [title, setTitle] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<'DRAFT' | 'ACTIVE'>('ACTIVE');

  // Single Variant Fields
  const [basePrice, setBasePrice] = React.useState('100.00');
  const [compareAtPrice, setCompareAtPrice] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [inventoryQuantity, setInventoryQuantity] = React.useState('10');
  const [allowBackorder, setAllowBackorder] = React.useState(false);

  // Multi-Variant Options State
  const [hasOptions, setHasOptions] = React.useState(false);
  const [options, setOptions] = React.useState<ProductOption[]>([
    { name: 'المقاس', values: ['S', 'M', 'L'] },
  ]);
  const [variants, setVariants] = React.useState<CreateVariantInput[]>([]);

  // Submission State
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Media Assets State
  const [selectedImages, setSelectedImages] = React.useState<Array<{ url: string; altText?: string }>>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = React.useState(false);

  // Generate Cartesian Product of Variant Options
  React.useEffect(() => {
    if (!hasOptions || options.length === 0) {
      setVariants([]);
      return;
    }

    const validOptions = options.filter(
      (opt) => opt.name.trim() !== '' && opt.values.length > 0
    );

    if (validOptions.length === 0) {
      setVariants([]);
      return;
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
        [[]]
      );
    };

    const combinations = cartesian(validOptions.map((o) => o.values));
    const baseCents = Math.round(parseFloat(basePrice || '0') * 100);

    const generatedVariants: CreateVariantInput[] = combinations.map((combo, idx) => {
      const optionValues: Record<string, string> = {};
      validOptions.forEach((opt, i) => {
        const optionName = opt.name;
        const optionValue = combo[i];
        if (optionName && optionValue) {
          optionValues[optionName] = optionValue;
        }
      });

      const variantTitle = combo.join(' / ');

      return {
        title: variantTitle,
        sku: `${sku ? `${sku}-` : ''}${combo.join('-')}`,
        priceCents: baseCents,
        inventoryQuantity: parseInt(inventoryQuantity || '0', 10),
        allowBackorder,
        optionValues,
        position: idx,
      };
    });

    setVariants(generatedVariants);
  }, [hasOptions, options, basePrice, sku, inventoryQuantity, allowBackorder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (title.trim().length < 2) {
      setFieldErrors({ title: 'اسم المنتج يجب أن يحتوي على حرفين على الأقل' });
      return;
    }

    const baseCents = Math.round(parseFloat(basePrice || '0') * 100);
    const compareCents = compareAtPrice
      ? Math.round(parseFloat(compareAtPrice) * 100)
      : null;

    setIsLoading(true);

    try {
      const actionPayload = {
        storeId,
        title: title.trim(),
        handle: handle.trim() || undefined,
        description: description.trim() || null,
        status,
        options: hasOptions ? options : [],
        variants: hasOptions ? variants : undefined,
        basePriceCents: baseCents,
        compareAtPriceCents: compareCents,
        inventoryQuantity: parseInt(inventoryQuantity || '0', 10),
        allowBackorder,
        sku: sku.trim() || null,
        metadata: {
          images: selectedImages,
        },
      };

      const result = await createProductAction(actionPayload);

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

      router.push('/app/products');
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع أثناء إضافة المنتج.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {error ? (
        <div
          role="alert"
          className="md:col-span-3 p-3 text-sm text-feedback-danger bg-red-50 border border-red-200 rounded-sm"
        >
          {error}
        </div>
      ) : null}

      {/* Main Details (2 Columns) */}
      <div className="md:col-span-2 space-y-6">
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-text-primary">بيانات المنتج الأساسية</h2>

          <Input
            id="product-title"
            label="اسم المنتج"
            required
            placeholder="مثال: عطر العود الملكي"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors['title']}
          />

          <div>
            <label htmlFor="product-description" className="block text-sm font-medium text-text-primary mb-1">
              وصف المنتج
            </label>
            <textarea
              id="product-description"
              rows={4}
              className="w-full p-3 border border-border-strong rounded-sm bg-background-primary text-text-primary text-sm focus:outline-none focus:border-brand-primary"
              placeholder="أدخل وصفاً تفصيلياً للمنتج ومميزاته..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Card>

        {/* Product Media Gallery */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">صور المنتج (Media Gallery)</h2>
              <p className="text-xs text-text-secondary">
                أضف صور المنتج بدقة عالية لإبراز تفاصيل السلعة للعملاء
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsMediaModalOpen(true)}
            >
              + إضافة صورة
            </Button>
          </div>

          {selectedImages.length === 0 ? (
            <div
              onClick={() => setIsMediaModalOpen(true)}
              className="p-6 border-2 border-dashed border-border-strong rounded text-center cursor-pointer hover:border-brand-primary transition-colors bg-canvas"
            >
              <span className="text-2xl block mb-1">🖼️</span>
              <p className="text-xs font-semibold text-text-primary">
                انقر هنا لاختيار أو رفع صور المنتج
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                يدعم JPG, PNG, WebP حتى 15 ميجابايت
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {selectedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square rounded border border-border-subtle overflow-hidden bg-canvas"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText || `صورة المنتج ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف الصورة"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div
                onClick={() => setIsMediaModalOpen(true)}
                className="aspect-square border border-dashed border-border-strong rounded flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary transition-colors text-text-muted hover:text-brand-primary"
              >
                <span className="text-xl">+</span>
                <span className="text-[10px] font-semibold mt-1">إضافة المزيد</span>
              </div>
            </div>
          )}
        </Card>

        {/* Pricing & Inventory */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-text-primary">
            التسعير والمخزون ({currency})
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="base-price"
              label="سعر البيع"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              error={fieldErrors['basePriceCents']}
            />

            <Input
              id="compare-at-price"
              label="السعر قبل الخصم (اختياري)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="product-sku"
              label="رمز SKU (رمز التخزين)"
              placeholder="مثال: PRD-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <Input
              id="inventory-quantity"
              label="كمية المخزون"
              type="number"
              min="0"
              value={inventoryQuantity}
              onChange={(e) => setInventoryQuantity(e.target.value)}
              disabled={hasOptions}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="allow-backorder"
              type="checkbox"
              checked={allowBackorder}
              onChange={(e) => setAllowBackorder(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="allow-backorder" className="text-sm text-text-primary">
              السماح للعملاء بالطلب عند نفاد الكمية (Backorder)
            </label>
          </div>
        </Card>

        {/* Multi-Variant Options Builder */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">خيارات المنتج المتعددة</h2>
              <p className="text-xs text-text-secondary">
                مثل المقاسات والألوان والروائح
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasOptions}
                onChange={(e) => setHasOptions(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm font-medium text-text-primary">تفعيل الخيارات</span>
            </label>
          </div>

          {hasOptions && (
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              {options.map((opt, idx) => (
                <div key={idx} className="p-3 bg-background-secondary rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">الخاصية #{idx + 1}</span>
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="text-xs text-feedback-danger hover:underline"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      id={`opt-name-${idx}`}
                      label="اسم الخاصية"
                      placeholder="المقاس، اللون..."
                      value={opt.name}
                      onChange={(e) => {
                        const updated = [...options];
                        const item = updated[idx];
                        if (item) {
                          item.name = e.target.value;
                          setOptions(updated);
                        }
                      }}
                    />
                    <div className="col-span-2">
                      <Input
                        id={`opt-values-${idx}`}
                        label="القيم (مفصولة بفاصلة)"
                        placeholder="S, M, L, XL"
                        value={opt.values.join(', ')}
                        onChange={(e) => {
                          const updated = [...options];
                          const item = updated[idx];
                          if (item) {
                            item.values = e.target.value
                              .split(',')
                              .map((v) => v.trim())
                              .filter((v) => v.length > 0);
                            setOptions(updated);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOptions([...options, { name: '', values: [] }])}
              >
                + إضافة خاصية أخرى
              </Button>

              {/* Generated Variant Matrix */}
              {variants.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h3 className="text-sm font-bold text-text-primary">
                    مصفوفة النسخ المولدة ({variants.length} نسخة)
                  </h3>
                  <div className="overflow-x-auto border border-border-subtle rounded-sm">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-background-secondary text-text-secondary border-b border-border-subtle">
                        <tr>
                          <th className="p-2">النسخة</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">السعر ({currency})</th>
                          <th className="p-2">المخزون</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {variants.map((v, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium">{v.title}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                className="w-24 p-1 border border-border-strong rounded text-xs"
                                value={v.sku || ''}
                                onChange={(e) => {
                                  const updated = [...variants];
                                  const item = updated[i];
                                  if (item) {
                                    item.sku = e.target.value;
                                    setVariants(updated);
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 font-mono">
                              <input
                                type="number"
                                className="w-20 p-1 border border-border-strong rounded text-xs"
                                value={(v.priceCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const updated = [...variants];
                                  const item = updated[i];
                                  if (item) {
                                    item.priceCents = Math.round(parseFloat(e.target.value || '0') * 100);
                                    setVariants(updated);
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 font-mono">
                              <input
                                type="number"
                                className="w-16 p-1 border border-border-strong rounded text-xs"
                                value={v.inventoryQuantity ?? 0}
                                onChange={(e) => {
                                  const updated = [...variants];
                                  const item = updated[i];
                                  if (item) {
                                    item.inventoryQuantity = parseInt(e.target.value || '0', 10);
                                    setVariants(updated);
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar Organization & Status (1 Column) */}
      <div className="space-y-6">
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-text-primary">حالة المنتج</h2>

          <div>
            <label htmlFor="product-status" className="block text-sm font-medium text-text-primary mb-1">
              حالة النشر
            </label>
            <select
              id="product-status"
              className="w-full h-10 px-3 border border-border-strong rounded-sm bg-background-primary text-text-primary text-sm focus:outline-none focus:border-brand-primary"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}
            >
              <option value="ACTIVE">نشط (جاهز للبيع)</option>
              <option value="DRAFT">مسودة (غير معروض)</option>
            </select>
          </div>

          <Input
            id="custom-handle"
            label="معرف الرابط (Handle)"
            placeholder="auto-generated"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />

          <div className="pt-4 border-t border-border-subtle space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              حفظ وإضافة المنتج
            </Button>
          </div>
        </Card>
      </div>

      <MediaPickerModal
        storeId={storeId}
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url, asset) => {
          setSelectedImages((prev) => [
            ...prev,
            { url, altText: asset.altText || asset.filename },
          ]);
        }}
      />
    </form>
  );
}
