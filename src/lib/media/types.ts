export type MediaVisibility = 'PUBLIC' | 'PRIVATE';

export interface MediaAsset {
  id: string;
  storeId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  visibility: MediaVisibility;
  width: number | null;
  height: number | null;
  altText: string | null;
  publicUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string | null;
  expiresInSeconds: number;
}

export interface PrivateDownloadUrlResult {
  downloadUrl: string;
  expiresAt: string;
}

export interface RegisterMediaInput {
  storeId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  visibility: MediaVisibility;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
}

export interface MediaFilters {
  visibility?: MediaVisibility;
  mimeTypePrefix?: string;
  limit?: number;
  offset?: number;
}
