'use client';

import * as React from 'react';
import { SectionConfig, SectionSchema } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MediaPickerModal } from '@/components/dashboard/media-picker-modal';

interface SectionInspectorProps {
  section: SectionConfig;
  schema: SectionSchema;
  storeId?: string;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  onBackToTree: () => void;
}

export function SectionInspector({
  section,
  schema,
  storeId,
  onUpdateSettings,
  onBackToTree,
}: SectionInspectorProps) {
  const settings = section.settings || {};
  const [activeImageFieldId, setActiveImageFieldId] = React.useState<string | null>(null);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    onUpdateSettings({
      ...settings,
      [fieldId]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <button
            type="button"
            onClick={onBackToTree}
            className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium mb-1"
          >
            ← العودة للأقسام
          </button>
          <h3 className="text-sm font-bold text-text-primary">{schema.name}</h3>
        </div>
        <span className="text-xs font-mono text-text-muted">{section.type}</span>
      </div>

      <div className="space-y-4">
        {schema.fields.map((field) => {
          const value = settings[field.id] !== undefined ? settings[field.id] : field.default;

          if (field.type === 'text') {
            return (
              <Input
                key={field.id}
                id={`field_${field.id}`}
                label={field.label}
                value={(value as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              />
            );
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.id}>
                <label
                  htmlFor={`field_${field.id}`}
                  className="block text-xs font-semibold text-text-primary mb-1"
                >
                  {field.label}
                </label>
                <textarea
                  id={`field_${field.id}`}
                  rows={3}
                  className="w-full p-2.5 border border-border-strong rounded-sm bg-background-primary text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                  value={(value as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              </div>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <div key={field.id} className="flex items-center gap-2 pt-1">
                <input
                  id={`field_${field.id}`}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor={`field_${field.id}`} className="text-xs text-text-primary">
                  {field.label}
                </label>
              </div>
            );
          }

          if (field.type === 'select' && field.options) {
            return (
              <div key={field.id}>
                <label
                  htmlFor={`field_${field.id}`}
                  className="block text-xs font-semibold text-text-primary mb-1"
                >
                  {field.label}
                </label>
                <select
                  id={`field_${field.id}`}
                  className="w-full h-9 px-2.5 border border-border-strong rounded-sm bg-background-primary text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                  value={(value as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === 'range') {
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`field_${field.id}`} className="font-semibold text-text-primary">
                    {field.label}
                  </label>
                  <span className="font-mono text-text-secondary">{Number(value) || 0}</span>
                </div>
                <input
                  id={`field_${field.id}`}
                  type="range"
                  min={field.min ?? 1}
                  max={field.max ?? 50}
                  step={field.step ?? 1}
                  value={Number(value) || (field.min ?? 1)}
                  onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            );
          }

          if (field.type === 'image_picker') {
            const imageUrl = (value as string) || '';
            return (
              <div key={field.id} className="space-y-2">
                <label
                  htmlFor={`field_${field.id}`}
                  className="block text-xs font-semibold text-text-primary"
                >
                  {field.label}
                </label>

                {imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded border border-border-subtle overflow-hidden bg-canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={field.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      {storeId && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveImageFieldId(field.id)}
                          className="text-xs flex-1"
                        >
                          تغيير الصورة
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFieldChange(field.id, '')}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        إزالة
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {storeId ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveImageFieldId(field.id)}
                        className="w-full text-xs"
                      >
                        📷 اختيار صورة من الوسائط
                      </Button>
                    ) : null}
                    <Input
                      id={`field_${field.id}`}
                      placeholder="أو ألصق رابط الصورة مباشرة"
                      value={imageUrl}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {storeId && activeImageFieldId && (
        <MediaPickerModal
          storeId={storeId}
          isOpen={Boolean(activeImageFieldId)}
          onClose={() => setActiveImageFieldId(null)}
          onSelect={(url) => {
            handleFieldChange(activeImageFieldId, url);
            setActiveImageFieldId(null);
          }}
        />
      )}
    </div>
  );
}
