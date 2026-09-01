'use client';

import * as React from 'react';
import { SectionConfig, SectionSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface SectionTreeProps {
  sections: SectionConfig[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveSection: (index: number) => void;
  onAddSection: (type: string) => void;
  availableSchemas: SectionSchema[];
}

export function SectionTree({
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onRemoveSection,
  onAddSection,
  availableSchemas,
}: SectionTreeProps) {
  const [showAddModal, setShowAddModal] = React.useState(false);

  const getSectionName = (sec: SectionConfig): string => {
    const schema = availableSchemas.find((s) => s.type === sec.type);
    const customTitle = sec.settings['heading'] || sec.settings['title'] || sec.settings['announcement'];
    if (typeof customTitle === 'string' && customTitle.trim().length > 0) {
      return `${schema ? schema.name : sec.type}: "${customTitle.trim().substring(0, 20)}"`;
    }
    return schema ? schema.name : sec.type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-text-secondary uppercase">
          هيكلية أقسام الصفحة ({sections.length})
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-xs"
        >
          + إضافة قسم
        </Button>
      </div>

      <div className="space-y-1.5">
        {sections.map((sec, index) => {
          const isSelected = selectedSectionId === sec.id;
          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`p-2.5 rounded-sm border cursor-pointer flex items-center justify-between transition-colors ${
                isSelected
                  ? 'border-brand-primary bg-sky-50/50 text-brand-primary font-semibold'
                  : 'border-border-subtle bg-surface hover:bg-background-secondary text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs font-mono text-text-muted">#{index + 1}</span>
                <span className="text-xs truncate">{getSectionName(sec)}</span>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  className="p-1 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  title="تحريك لأعلى"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={() => onMoveDown(index)}
                  className="p-1 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  title="تحريك لأسفل"
                >
                  ↓
                </button>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSection(index)}
                    className="p-1 text-xs text-feedback-danger hover:underline ml-1"
                    title="حذف القسم"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-strong rounded-sm max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-text-primary">إضافة قسم جديد إلى الصفحة</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
              {availableSchemas.map((schema) => (
                <div
                  key={schema.type}
                  onClick={() => {
                    onAddSection(schema.type);
                    setShowAddModal(false);
                  }}
                  className="p-3 border border-border-subtle rounded-sm hover:border-brand-primary hover:bg-sky-50/20 cursor-pointer transition-colors"
                >
                  <div className="font-semibold text-xs text-text-primary">{schema.name}</div>
                  {schema.description && (
                    <div className="text-xs text-text-secondary mt-0.5">{schema.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
