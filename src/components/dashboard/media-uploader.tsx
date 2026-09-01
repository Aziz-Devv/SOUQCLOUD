'use client';

import * as React from 'react';
import {
  createPresignedUploadAction,
  registerMediaAssetAction,
} from '@/app/actions/media';
import { MediaAsset, MediaVisibility } from '@/lib/media/types';
import { MAX_MEDIA_FILE_SIZE_BYTES } from '@/lib/schemas/media';

interface MediaUploaderProps {
  storeId: string;
  visibility?: MediaVisibility;
  onUploadComplete: (asset: MediaAsset) => void;
  accept?: string;
}

export function MediaUploader({
  storeId,
  visibility = 'PUBLIC',
  onUploadComplete,
  accept = 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif',
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number } | null> => {
    if (!file.type.startsWith('image/')) return Promise.resolve(null);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    setErrorMessage(null);

    if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
      setErrorMessage('حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميجابايت)');
      return;
    }

    if (visibility === 'PUBLIC' && file.type === 'application/pdf') {
      setErrorMessage('ملفات PDF غير مسموحة كوسائط عامة');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Get Image Dimensions if image
      const dimensions = await getImageDimensions(file);

      // 2. Request Presigned Upload URL
      setUploadProgress(30);
      const presignedRes = await createPresignedUploadAction({
        storeId,
        filename: file.name,
        mimeType: file.type as any,
        fileSize: file.size,
        visibility,
      });

      if (!presignedRes.success) {
        setErrorMessage(presignedRes.error.message || 'فشل تجهيز رابط الرفع');
        setIsUploading(false);
        return;
      }

      const { uploadUrl, storageKey } = presignedRes.data;

      // 3. Upload Binary directly to Cloudflare R2
      setUploadProgress(60);
      if (!uploadUrl.includes('mock-r2')) {
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('فشل رفع الملف إلى خادم التخزين السحابي');
        }
      }

      // 4. Register Asset in Database
      setUploadProgress(85);
      const registerRes = await registerMediaAssetAction({
        storeId,
        storageKey,
        filename: file.name,
        mimeType: file.type as any,
        fileSizeBytes: file.size,
        visibility,
        width: dimensions?.width,
        height: dimensions?.height,
        altText: file.name.split('.')[0] || null,
      });

      if (!registerRes.success) {
        setErrorMessage(registerRes.error.message || 'فشل تسجيل الوسيط في قاعدة البيانات');
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);
      onUploadComplete(registerRes.data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة رفع الملف'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0]) {
      handleUploadFile(files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadFile(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-2 border-dashed rounded-card text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-brand-primary bg-brand-primary/5'
            : 'border-border-strong hover:border-brand-primary bg-surface'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-text-muted">
            📁
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary">
              اسحب وأفلت الملف هنا، أو <span className="text-brand-primary">تصفح جهازك</span>
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              الحد الأقصى: 15 ميجابايت (JPG, PNG, WebP, SVG, GIF)
            </p>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>جاري رفع الملف إلى التخزين السحابي...</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-canvas h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-primary h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
