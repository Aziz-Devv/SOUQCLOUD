/**
 * Core Platform Types & Universal Envelopes
 * Source of Truth: docs/01-architecture/domain-model.md, docs/01-architecture/error-handling.md, docs/01-architecture/identity-and-membership-model.md
 */

export type PlatformErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiError {
  code: PlatformErrorCode;
  message: string;
  details?: ApiErrorDetail[];
  request_id?: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export type StoreOrderMode = 'DASHBOARD' | 'WHATSAPP' | 'BOTH';

export type StoreStatus = 'DRAFT' | 'PUBLISHED' | 'MAINTENANCE' | 'ARCHIVED';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'PAUSED'
  | 'CANCELED';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'STAFF';

export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type MerchantStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  status: MerchantStatus;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  merchantId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionContext {
  user: UserProfile;
  merchant: Merchant;
  membership: Membership;
}

export interface TenantContext {
  storeId?: string;
  merchantId?: string;
  handle?: string;
  host: string;
}

export interface Store {
  id: string;
  merchantId: string;
  name: string;
  handle: string;
  customDomain?: string | null;
  currency: string;
  defaultLocale: string;
  defaultCountryCode: string;
  status: StoreStatus;
  orderMode: StoreOrderMode;
  whatsappPhone?: string | null;
  whatsappSettings: {
    auto_redirect: boolean;
    custom_message_template?: string | null;
  };
  orderSequenceCounter: number;
  settings: {
    shipping: {
      flat_rate_cents: number;
      free_shipping_threshold_cents?: number | null;
    };
    tax: {
      tax_rate_basis_points: number;
      tax_included_in_price: boolean;
    };
    branding: {
      logo_url?: string | null;
      favicon_url?: string | null;
      social_links?: Record<string, string>;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface StoreSummary {
  id: string;
  merchantId: string;
  name: string;
  handle: string;
  customDomain?: string | null;
  currency: string;
  defaultLocale: string;
  defaultCountryCode: string;
  status: StoreStatus;
  orderMode: StoreOrderMode;
  whatsappPhone?: string | null;
  createdAt: string;
}

export interface CreateStoreInput {
  name: string;
  handle: string;
  defaultCountryCode: string;
  currency?: string;
  defaultLocale?: 'ar' | 'en';
  orderMode?: StoreOrderMode;
  whatsappPhone?: string;
}

export interface CheckHandleResult {
  available: boolean;
  reason?: string;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductOption {
  name: string;
  values: string[];
}

export interface Variant {
  id: string;
  storeId: string;
  productId: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  priceCents: number;
  compareAtPriceCents?: number | null;
  inventoryQuantity: number;
  allowBackorder: boolean;
  optionValues: Record<string, string>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  title: string;
  handle: string;
  description?: string | null;
  status: ProductStatus;
  options: ProductOption[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProductDetail extends Product {
  variants: Variant[];
}

export interface ProductSummary {
  id: string;
  storeId: string;
  title: string;
  handle: string;
  status: ProductStatus;
  basePriceCents: number;
  compareAtPriceCents?: number | null;
  variantsCount: number;
  totalInventory: number;
  createdAt: string;
}

export interface CreateVariantInput {
  title?: string;
  sku?: string | null;
  barcode?: string | null;
  priceCents: number;
  compareAtPriceCents?: number | null;
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  optionValues?: Record<string, string>;
  position?: number;
}

export interface CreateProductInput {
  storeId: string;
  title: string;
  handle?: string;
  description?: string | null;
  status?: ProductStatus;
  options?: ProductOption[];
  variants?: CreateVariantInput[];
  basePriceCents?: number;
  compareAtPriceCents?: number | null;
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  sku?: string | null;
}

export interface UpdateProductInput {
  title?: string;
  handle?: string;
  description?: string | null;
  status?: ProductStatus;
  options?: ProductOption[];
  variants?: CreateVariantInput[];
}

export type PageType = 'HOME' | 'PRODUCT' | 'COLLECTION' | 'CART' | 'PAGE' | 'POLICY';

export interface DesignTokens {
  colors: {
    brandPrimary: string;
    brandHover: string;
    brandSubtle: string;
    bgCanvas: string;
    bgSurface: string;
    borderSubtle: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  radii: {
    button: string;
    card: string;
  };
}

export interface ThemeTemplate {
  id: string; // 'default-modern' | 'minimal-elegance' | 'vibrant-retail'
  name: string;
  description: string;
  defaultTokens: DesignTokens;
}

export interface Theme {
  id: string;
  storeId: string;
  name: string;
  themeTemplateId: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  designTokens: DesignTokens;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeSummary {
  id: string;
  storeId: string;
  name: string;
  themeTemplateId: string;
  isActive: boolean;
  createdAt: string;
}

export interface SectionFieldSchema {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'image_picker'
    | 'color'
    | 'select'
    | 'range'
    | 'checkbox'
    | 'product_picker';
  label: string;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface SectionSchema {
  type: string; // e.g. 'header', 'hero', 'featured_products', 'banner', 'rich_text', 'footer'
  name: string;
  description?: string;
  fields: SectionFieldSchema[];
  defaultSettings: Record<string, unknown>;
}

export interface SectionConfig {
  id: string;
  type: string;
  settings: Record<string, unknown>;
}

export interface Page {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  pageType: PageType;
  isPublished: boolean;
  sections: SectionConfig[];
  draftSections: SectionConfig[];
  version: number;
  seo: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PageDetail extends Page {
  theme?: Theme;
}



