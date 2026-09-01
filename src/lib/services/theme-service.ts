import { createClient } from '@/lib/supabase/server';
import {
  InternalError,
  NotFoundError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { DesignTokens, Theme, ThemeSummary } from '@/lib/types';
import { THEME_TEMPLATES } from '@/lib/theme-engine/tokens';

/**
 * Provisions standard theme presets for a newly created store.
 * Sets 'default-modern' as the initially active theme.
 */
export async function initializeStoreDefaultThemes(storeId: string): Promise<void> {
  const supabase = await createClient();

  const presetsToInsert = [
    {
      store_id: storeId,
      name: THEME_TEMPLATES['default-modern'].name,
      theme_template_id: 'default-modern',
      is_active: true,
      settings: {},
      design_tokens: THEME_TEMPLATES['default-modern'].defaultTokens,
    },
    {
      store_id: storeId,
      name: THEME_TEMPLATES['minimal-elegance'].name,
      theme_template_id: 'minimal-elegance',
      is_active: false,
      settings: {},
      design_tokens: THEME_TEMPLATES['minimal-elegance'].defaultTokens,
    },
    {
      store_id: storeId,
      name: THEME_TEMPLATES['vibrant-retail'].name,
      theme_template_id: 'vibrant-retail',
      is_active: false,
      settings: {},
      design_tokens: THEME_TEMPLATES['vibrant-retail'].defaultTokens,
    },
  ];

  const { error } = await supabase.from('themes').insert(presetsToInsert);

  if (error) {
    logger.error('Failed to initialize default themes for store', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء تهيئة قوالب المتجر.');
  }

  logger.info('Initialized default themes for store', { storeId, themesCount: presetsToInsert.length });
}

/**
 * Retrieves all installed themes for a given store.
 */
export async function getStoreThemes(storeId: string): Promise<ThemeSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('themes')
    .select('id, store_id, name, theme_template_id, is_active, created_at')
    .eq('store_id', storeId)
    .order('is_active', { ascending: false });

  if (error) {
    logger.error('Failed to fetch store themes', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع قوالب المتجر.');
  }

  // If no themes exist yet for this store, initialize them lazily
  if (!data || data.length === 0) {
    await initializeStoreDefaultThemes(storeId);
    return getStoreThemes(storeId);
  }

  return data.map((t) => ({
    id: t.id,
    storeId: t.store_id,
    name: t.name,
    themeTemplateId: t.theme_template_id,
    isActive: t.is_active,
    createdAt: t.created_at,
  }));
}

/**
 * Retrieves the currently active theme with design tokens for a store.
 */
export async function getActiveStoreTheme(storeId: string): Promise<Theme> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch active theme', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع القالب النشط.');
  }

  if (!data) {
    // Lazily initialize and retry
    await initializeStoreDefaultThemes(storeId);
    return getActiveStoreTheme(storeId);
  }

  return {
    id: data.id,
    storeId: data.store_id,
    name: data.name,
    themeTemplateId: data.theme_template_id,
    isActive: data.is_active,
    settings: data.settings || {},
    designTokens: data.design_tokens,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Activates a theme for a store.
 * Atomically deactivates the previous active theme and activates the target theme.
 * All store pages, draft sections, and content are preserved intact (ADR-003).
 */
export async function activateTheme(storeId: string, themeId: string): Promise<void> {
  const supabase = await createClient();

  // 1. Verify target theme exists and belongs to this store
  const { data: targetTheme, error: fetchError } = await supabase
    .from('themes')
    .select('id, name')
    .eq('id', themeId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (fetchError || !targetTheme) {
    throw new NotFoundError('القالب المطلوب غير موجود في هذا المتجر.');
  }

  // 2. Deactivate current active theme
  const { error: deactivateError } = await supabase
    .from('themes')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (deactivateError) {
    logger.error('Failed to deactivate previous theme', { storeId, error: deactivateError.message });
    throw new InternalError('حدث خطأ أثناء تعطيل القالب السابق.');
  }

  // 3. Activate target theme
  const { error: activateError } = await supabase
    .from('themes')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', themeId)
    .eq('store_id', storeId);

  if (activateError) {
    logger.error('Failed to activate target theme', { storeId, themeId, error: activateError.message });
    throw new InternalError('حدث خطأ أثناء تفعيل القالب الجديد.');
  }

  logger.info('Theme activated successfully (Pages preserved)', {
    storeId,
    themeId,
    themeName: targetTheme.name,
  });
}

/**
 * Updates design tokens for a specific theme.
 */
export async function updateThemeDesignTokens(
  themeId: string,
  storeId: string,
  tokens: DesignTokens
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('themes')
    .update({
      design_tokens: tokens,
      updated_at: new Date().toISOString(),
    })
    .eq('id', themeId)
    .eq('store_id', storeId);

  if (error) {
    logger.error('Failed to update theme design tokens', { themeId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء حفظ تخصيصات الألوان والتصميم.');
  }
}
