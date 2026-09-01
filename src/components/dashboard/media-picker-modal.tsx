'use client';

import * as React from 'react';
import { getStoreMediaAssetsAction } from '@/app/actions/media';
import { MediaAsset } from '@/lib/media/types';
import { MediaUploader } from './media-uploader';
import { Button } from '@/components/ui/button';

interface MediaPickerModalProps {
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, asset: MediaAsset) => void;
  title?: string;
}

export function MediaPickerModal({
  storeId,
  isOpen,
  onClose,
  onSelect,
  title = 'اختر صورة من الوسائط',
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = React.useState<'gallery' | 'upload'>('gallery');
  const [assets, setAssets] = React.useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);

  const loadAssets = React.useCallback(async () => {
    if (!isOpen || !storeId) return;
    setIsLoading(true);
    try {
      const res = await getStoreMediaAssetsAction({
        storeId,
        visibility: 'PUBLIC',
        limit: 50,
      });
      if (res.success) {
        setAssets(res.data.assets);
      }
    } catch {
      // Ignored in background
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, storeId]);

  React.useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen, loadAssets]);

  if (!isOpen) return null;

  const handleSelectCurrent = () => {
    const selected = assets.find((a) => a.id === selectedAssetId);
    if (selected && selected.publicUrl) {
      onSelect(selected.publicUrl, selected);
      onClose();
    }
  };

  const handleUploadComplete = (newAsset: MediaAsset) => {
    setAssets((prev) => [newAsset, ...prev]);
    setSelectedAssetId(newAsset.id);
    if (newAsset.publicUrl) {
      onSelect(newAsset.publicUrl, newAsset);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-surface border border-border-subtle rounded-card shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`py-2.5 px-4 border-b-2 transition-colors ${
              activeTab === 'gallery'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            معرض وسائط المتجر ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-4 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            رفع صورة جديدة
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 flex-1 overflow-y-auto min-h-[300px]">
          {activeTab === 'upload' ? (
            <div className="max-w-md mx-auto py-4">
              <MediaUploader
                storeId={storeId}
                visibility="PUBLIC"
                onUploadComplete={handleUploadComplete}
              />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-48 text-xs text-text-muted">
              جاري تحميل مكتبة الوسائط...
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-xs text-text-muted">لا توجد صور مرفوعة في هذا المتجر حتى الآن.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('upload')}
              >
                + رفع أول صورة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`group relative aspect-square rounded border cursor-pointer overflow-hidden transition-all ${
                      isSelected
                        ? 'border-brand-primary ring-2 ring-brand-primary/30'
                        : 'border-border-subtle hover:border-border-strong'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.publicUrl || ''}
                      alt={asset.altText || asset.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 p-1 text-[10px] text-white truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-border-subtle bg-canvas flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          {activeTab === 'gallery' && (
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedAssetId}
              onClick={handleSelectCurrent}
            >
              اختيار الصورة المحددة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
