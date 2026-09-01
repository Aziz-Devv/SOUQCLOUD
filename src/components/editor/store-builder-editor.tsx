'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Page,
  SectionConfig,
  SectionSchema,
  Theme,
  DesignTokens,
} from '@/lib/types';
import {
  saveDraftSectionsAction,
  publishPageSectionsAction,
  discardDraftSectionsAction,
  updateDesignTokensAction,
} from '@/app/actions/theme';
import { SectionTree } from './section-tree';
import { SectionInspector } from './section-inspector';
import { DesignTokensInspector } from './design-tokens-inspector';
import { LivePreviewCanvas } from './live-preview-canvas';
import { validateSectionConfig } from '@/lib/theme-engine/section-registry';

interface StoreBuilderEditorProps {
  initialPage: Page;
  storeId: string;
  storeName: string;
  theme: Theme;
  availableSchemas: SectionSchema[];
  pages: Page[];
}

export function StoreBuilderEditor({
  initialPage,
  storeId,
  storeName,
  theme,
  availableSchemas,
  pages,
}: StoreBuilderEditorProps) {
  const router = useRouter();

  // Page Revision State
  const [currentPageId, setCurrentPageId] = React.useState(initialPage.id);
  const [draftSections, setDraftSections] = React.useState<SectionConfig[]>(
    initialPage.draftSections || []
  );
  const [version, setVersion] = React.useState<number>(initialPage.version);
  const [tokens, setTokens] = React.useState<DesignTokens>(theme.designTokens);

  // Inspector & Workspace State
  const [activeTab, setActiveTab] = React.useState<'sections' | 'inspector' | 'tokens'>('sections');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(
    draftSections[0]?.id || null
  );
  const [viewport, setViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Operation States
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isDiscarding, setIsDiscarding] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = React.useState(false);

  const selectedSection = draftSections.find((s) => s.id === selectedSectionId);
  const selectedSchema = selectedSection
    ? availableSchemas.find((s) => s.type === selectedSection.type)
    : null;

  // Handle Section Selection
  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    setActiveTab('inspector');
  };

  // Section Reordering
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...draftSections];
    const item = updated[index];
    const prev = updated[index - 1];
    if (item && prev) {
      updated[index] = prev;
      updated[index - 1] = item;
      setDraftSections(updated);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === draftSections.length - 1) return;
    const updated = [...draftSections];
    const item = updated[index];
    const next = updated[index + 1];
    if (item && next) {
      updated[index] = next;
      updated[index + 1] = item;
      setDraftSections(updated);
    }
  };

  // Section Removal
  const handleRemoveSection = (index: number) => {
    if (draftSections.length <= 1) return;
    const updated = draftSections.filter((_, i) => i !== index);
    setDraftSections(updated);
    if (selectedSectionId === draftSections[index]?.id) {
      setSelectedSectionId(updated[0]?.id || null);
      setActiveTab('sections');
    }
  };

  // Section Addition
  const handleAddSection = (type: string) => {
    const newSection = validateSectionConfig({
      id: `sec_${type}_${Date.now()}`,
      type,
      settings: {},
    });
    setDraftSections([...draftSections, newSection]);
    setSelectedSectionId(newSection.id);
    setActiveTab('inspector');
  };

  // Section Settings Update
  const handleUpdateSectionSettings = (settings: Record<string, unknown>) => {
    if (!selectedSectionId) return;
    const updated = draftSections.map((sec) =>
      sec.id === selectedSectionId ? { ...sec, settings } : sec
    );
    setDraftSections(updated);
  };

  // Save Draft with Version CAS (ADR-003)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    setConcurrencyConflict(false);

    try {
      // 1. Save Design Tokens if modified
      await updateDesignTokensAction({
        themeId: theme.id,
        storeId,
        tokens,
      });

      // 2. Save Draft Sections via CAS
      const result = await saveDraftSectionsAction({
        pageId: currentPageId,
        storeId,
        sections: draftSections,
        expectedVersion: version,
      });

      if (!result.success) {
        if (result.error.code === 'CONFLICT') {
          setConcurrencyConflict(true);
        } else {
          setStatusMessage({ type: 'error', text: result.error.message });
        }
        setIsSaving(false);
        return;
      }

      setVersion(result.data.newVersion);
      setStatusMessage({ type: 'success', text: 'تم حفظ مسودة التعديلات بنجاح.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'حدث خطأ غير متوقع أثناء الحفظ.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Draft Sections
  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      // First save current draft to ensure freshness
      await saveDraftSectionsAction({
        pageId: currentPageId,
        storeId,
        sections: draftSections,
        expectedVersion: version,
      });

      const result = await publishPageSectionsAction({
        pageId: currentPageId,
        storeId,
      });

      if (!result.success) {
        setStatusMessage({ type: 'error', text: result.error.message });
        setIsPublishing(false);
        return;
      }

      setVersion(result.data.newVersion);
      setStatusMessage({ type: 'success', text: 'تم نشر التعديلات بنجاح إلى المتجر المباشر!' });
    } catch {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء نشر التعديلات.' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Discard Draft Sections
  const handleDiscard = async () => {
    if (!confirm('هل أنت متأكد من إلغاء مسودة التعديلات واستعادة النسخة المنشورة؟')) {
      return;
    }

    setIsDiscarding(true);
    setStatusMessage(null);

    try {
      const result = await discardDraftSectionsAction({
        pageId: currentPageId,
        storeId,
      });

      if (!result.success) {
        setStatusMessage({ type: 'error', text: result.error.message });
        setIsDiscarding(false);
        return;
      }

      router.refresh();
      setStatusMessage({ type: 'success', text: 'تم استعادة النسخة المنشورة بنجاح.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء استعادة النسخة المنشورة.' });
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-canvas text-text-primary overflow-hidden">
      {/* Top Application Bar for Visual Editor (56px) */}
      <header className="h-14 border-b border-border-subtle bg-surface px-4 flex items-center justify-between z-20 shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Link
            href="/app/online-store/themes"
            className="text-xs text-text-secondary hover:text-text-primary font-medium flex items-center gap-1"
          >
            ← العودة للقوالب
          </Link>
          <span className="text-border-strong">/</span>
          <span className="font-bold text-sm text-text-primary">{storeName}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono">
            {theme.name}
          </span>
        </div>

        {/* Page Selector & Viewport Switcher */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <select
            value={currentPageId}
            onChange={(e) => setCurrentPageId(e.target.value)}
            className="h-8 px-2.5 text-xs border border-border-strong rounded-sm bg-background-primary font-medium"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug === '' ? '/' : `/${p.slug}`})
              </option>
            ))}
          </select>

          {/* Viewport switcher */}
          <div className="hidden sm:flex items-center border border-border-subtle rounded p-0.5 bg-background-secondary text-xs">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`px-2 py-1 rounded ${viewport === 'desktop' ? 'bg-white shadow-xs font-bold text-brand-primary' : 'text-text-secondary'}`}
            >
              كمبيوتر
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`px-2 py-1 rounded ${viewport === 'tablet' ? 'bg-white shadow-xs font-bold text-brand-primary' : 'text-text-secondary'}`}
            >
              تابلت
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`px-2 py-1 rounded ${viewport === 'mobile' ? 'bg-white shadow-xs font-bold text-brand-primary' : 'text-text-secondary'}`}
            >
              جوال
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            isLoading={isDiscarding}
            className="text-xs text-text-muted hover:text-feedback-danger"
          >
            إلغاء التعديلات
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            isLoading={isSaving}
            className="text-xs"
          >
            حفظ كمسودة (v{version})
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            isLoading={isPublishing}
            className="text-xs"
          >
            نشر التعديلات
          </Button>
        </div>
      </header>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between flex-shrink-0 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace (Side-by-Side: Controls on Left / Preview on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel (360px) */}
        <aside className="w-80 md:w-96 border-l border-border-subtle bg-surface flex flex-col flex-shrink-0 z-10">
          {/* Navigation Tabs */}
          <div className="flex border-b border-border-subtle text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'sections'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              أقسام الصفحة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              disabled={!selectedSection}
              className={`flex-1 py-3 text-center transition-colors border-b-2 disabled:opacity-40 ${
                activeTab === 'inspector'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              إعدادات القسم
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'tokens'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              الألوان والهوية
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'sections' && (
              <SectionTree
                sections={draftSections}
                selectedSectionId={selectedSectionId}
                onSelectSection={handleSelectSection}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemoveSection={handleRemoveSection}
                onAddSection={handleAddSection}
                availableSchemas={availableSchemas}
              />
            )}

            {activeTab === 'inspector' && selectedSection && selectedSchema && (
              <SectionInspector
                section={selectedSection}
                schema={selectedSchema}
                storeId={storeId}
                onUpdateSettings={handleUpdateSectionSettings}
                onBackToTree={() => setActiveTab('sections')}
              />
            )}

            {activeTab === 'tokens' && (
              <DesignTokensInspector
                tokens={tokens}
                onUpdateTokens={setTokens}
              />
            )}
          </div>
        </aside>

        {/* Center / Right Interactive Live Preview Canvas */}
        <LivePreviewCanvas
          sections={draftSections}
          tokens={tokens}
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
          viewport={viewport}
          storeName={storeName}
        />
      </div>

      {/* 409 Conflict Concurrency Modal */}
      {concurrencyConflict && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-feedback-danger">
            <div className="flex items-center gap-3 text-feedback-danger">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold">تعارض في جلسات التعديل (409 Conflict)</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              تم تعديل وحفظ هذه الصفحة في نافذة أو جلسة أخرى مسبقاً، لمنع مسح تعديلاتك الأحدث يجب إعادة تحميل أحدث نسخة من الصفحة.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setConcurrencyConflict(false);
                  router.refresh();
                }}
              >
                تحديث الصفحة واسترجاع أحدث نسخة
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
