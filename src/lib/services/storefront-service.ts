import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DesignTokens, Page, ProductOption, ProductStatus, SectionConfig, Theme, Variant } from '@/lib/types';
import { DEFAULT_DESIGN_TOKENS } from '@/lib/theme-engine/tokens';

export interface PublicStore {
  id: string;
  name: string;
  handle: string;
  customDomain: string | null;
  currency: string;
  defaultLocale: string;
  defaultCountryCode: string;
  orderMode: 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  whatsappPhone: string | null;
  whatsappSettings: {
    auto_redirect?: boolean;
    custom_message_template?: string | null;
  };
  branding: {
    logo_url?: string | null;
    favicon_url?: string | null;
    social_links?: Record<string, string>;
  };
  shippingSettings: {
    flat_rate_cents?: number;
    free_shipping_threshold_cents?: number | null;
  };
  taxIncludedInPrice: boolean;
  taxRateBasisPoints: number;
  createdAt: string;
}

export interface StorefrontProductDetail {
  id: string;
  storeId: string;
  title: string;
  handle: string;
  description: string | null;
  status: ProductStatus;
  images: string[];
  options: ProductOption[];
  metadata: Record<string, unknown>;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Resolves a public store by handle from the restricted public_stores view.
 * Returns null if the store does not exist or is not in PUBLISHED status.
 */
export async function resolveStorefrontByHandle(
  handle: string
): Promise<PublicStore | null> {
  const normalizedHandle = handle.trim().toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('public_stores')
    .select('*')
    .eq('handle', normalizedHandle)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      logger.error('Failed to resolve storefront by handle', {
        handle: normalizedHandle,
        error: error.message,
      });
    }
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    handle: data.handle,
    customDomain: data.custom_domain,
    currency: data.currency,
    defaultLocale: data.default_locale,
    defaultCountryCode: data.default_country_code,
    orderMode: data.order_mode,
    whatsappPhone: data.whatsapp_phone,
    whatsappSettings: data.whatsapp_settings || {},
    branding: data.branding || {},
    shippingSettings: data.shipping_settings || {},
    taxIncludedInPrice: Boolean(data.tax_included_in_price),
    taxRateBasisPoints: Number(data.tax_rate_basis_points) || 0,
    createdAt: data.created_at,
  };
}

/**
 * Resolves a public store by its active custom domain hostname via hardened RPC.
 * Returns null if the domain is not verified or the store is not published.
 */
export async function resolveStorefrontByCustomDomain(
  hostname: string
): Promise<PublicStore | null> {
  const cleanHost = (hostname || '').trim().toLowerCase().split(':')[0] || '';
  if (!cleanHost) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('resolve_store_by_custom_domain', {
    p_hostname: cleanHost,
  });

  if (error || !data || data.length === 0) {
    if (error) {
      logger.error('Failed to resolve storefront by custom domain', {
        hostname: cleanHost,
        error: error.message,
      });
    }
    return null;
  }

  const handle = data[0].handle;
  return await resolveStorefrontByHandle(handle);
}

/**
 * Retrieves the active theme and design tokens for a storefront.
 */
export async function getStorefrontTheme(storeId: string): Promise<Theme> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    logger.warn('No active theme found for store, falling back to default tokens', {
      storeId,
      error: error?.message,
    });
    return {
      id: 'default',
      storeId,
      name: 'Default Theme',
      themeTemplateId: 'default-modern',
      isActive: true,
      designTokens: DEFAULT_DESIGN_TOKENS,
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    storeId: data.store_id,
    name: data.name,
    themeTemplateId: data.theme_template_id,
    isActive: data.is_active,
    designTokens: (data.design_tokens as DesignTokens) || DEFAULT_DESIGN_TOKENS,
    settings: (data.settings as Record<string, unknown>) || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves a published page by slug.
 * SECURITY INVARIANT: Only returns published `sections` (JSONB) — never `draft_sections`.
 */
export async function getStorefrontPage(
  storeId: string,
  slug: string = ''
): Promise<Page | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('store_id', storeId)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    storeId: data.store_id,
    title: data.title,
    slug: data.slug,
    pageType: data.page_type,
    isPublished: data.is_published,
    sections: (data.sections as SectionConfig[]) || [],
    draftSections: [], // Deliberately omit draft sections from public storefront
    version: data.version,
    seo: data.seo || { title: data.title },
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves active products for storefront catalog and collection displays.
 */
export async function getStorefrontProducts(
  storeId: string
): Promise<StorefrontProductDetail[]> {
  const supabase = await createClient();

  const { data: productsData, error: prodError } = await supabase
    .from('products')
    .select('*, variants(*)')
    .eq('store_id', storeId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (prodError || !productsData) {
    logger.error('Failed to fetch storefront products', { storeId, error: prodError?.message });
    return [];
  }

  return productsData.map((p) => {
    const metadata = (p.metadata as Record<string, unknown>) || {};
    const images = Array.isArray(metadata['images']) ? (metadata['images'] as string[]) : [];

    return {
      id: p.id,
      storeId: p.store_id,
      title: p.title,
      handle: p.handle,
      description: p.description,
      status: p.status,
      images,
      options: (p.options as ProductOption[]) || [],
      metadata,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      variants: (p.variants || [])
        .map((v: {
          id: string;
          store_id: string;
          product_id: string;
          title: string;
          sku: string | null;
          barcode: string | null;
          price_cents: number;
          compare_at_price_cents: number | null;
          inventory_quantity: number;
          allow_backorder: boolean;
          option_values: Record<string, string>;
          position: number;
          created_at: string;
          updated_at: string;
        }) => ({
          id: v.id,
          storeId: v.store_id,
          productId: v.product_id,
          title: v.title,
          sku: v.sku,
          barcode: v.barcode,
          priceCents: v.price_cents,
          compareAtPriceCents: v.compare_at_price_cents,
          inventoryQuantity: v.inventory_quantity,
          allowBackorder: v.allow_backorder,
          optionValues: v.option_values || {},
          position: v.position,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        })),
    };
  });
}

/**
 * Retrieves a single active product by handle for PDP rendering.
 */
export async function getStorefrontProductByHandle(
  storeId: string,
  handle: string
): Promise<StorefrontProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*)')
    .eq('store_id', storeId)
    .eq('handle', handle)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const metadata = (data.metadata as Record<string, unknown>) || {};
  const images = Array.isArray(metadata['images']) ? (metadata['images'] as string[]) : [];

  return {
    id: data.id,
    storeId: data.store_id,
    title: data.title,
    handle: data.handle,
    description: data.description,
    status: data.status,
    images,
    options: (data.options as ProductOption[]) || [],
    metadata,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    variants: (data.variants || [])
      .map((v: {
        id: string;
        store_id: string;
        product_id: string;
        title: string;
        sku: string | null;
        barcode: string | null;
        price_cents: number;
        compare_at_price_cents: number | null;
        inventory_quantity: number;
        allow_backorder: boolean;
        option_values: Record<string, string>;
        position: number;
        created_at: string;
        updated_at: string;
      }) => ({
        id: v.id,
        storeId: v.store_id,
        productId: v.product_id,
        title: v.title,
        sku: v.sku,
        barcode: v.barcode,
        priceCents: v.price_cents,
        compareAtPriceCents: v.compare_at_price_cents,
        inventoryQuantity: v.inventory_quantity,
        allowBackorder: v.allow_backorder,
        optionValues: v.option_values || {},
        position: v.position,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      })),
  };
}
