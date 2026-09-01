import { createClient } from '@/lib/supabase/server';
import {
  ConflictError,
  InternalError,
  NotFoundError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { Page, SectionConfig } from '@/lib/types';
import {
  getDefaultHomepageSections,
  validateSectionConfig,
} from '@/lib/theme-engine/section-registry';

/**
 * Initializes default store pages (such as the Homepage).
 */
export async function initializeStoreDefaultPages(storeId: string): Promise<void> {
  const supabase = await createClient();

  const defaultSections = getDefaultHomepageSections();

  const defaultPages = [
    {
      store_id: storeId,
      title: 'الصفحة الرئيسية',
      slug: '',
      page_type: 'HOME' as const,
      is_published: true,
      sections: defaultSections,
      draft_sections: defaultSections,
      version: 1,
      seo: { title: 'الرئيسية', description: 'متجرنا الإلكتروني' },
    },
  ];

  const { error } = await supabase.from('pages').insert(defaultPages);

  if (error) {
    logger.error('Failed to initialize default pages', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء تهيئة صفحات المتجر.');
  }

  logger.info('Initialized default pages for store', { storeId });
}

/**
 * Retrieves all pages for a given store.
 */
export async function getStorePages(storeId: string): Promise<Page[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch store pages', { storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع صفحات المتجر.');
  }

  if (!data || data.length === 0) {
    await initializeStoreDefaultPages(storeId);
    return getStorePages(storeId);
  }

  return data.map((p) => ({
    id: p.id,
    storeId: p.store_id,
    title: p.title,
    slug: p.slug,
    pageType: p.page_type,
    isPublished: p.is_published,
    sections: p.sections || [],
    draftSections: p.draft_sections || [],
    version: Number(p.version || 1),
    seo: p.seo || {},
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

/**
 * Retrieves a single page by its ID.
 */
export async function getPageById(pageId: string, storeId: string): Promise<Page> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch page by ID', { pageId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع بيانات الصفحة.');
  }

  if (!data) {
    throw new NotFoundError('الصفحة المطلوبة غير موجودة.');
  }

  return {
    id: data.id,
    storeId: data.store_id,
    title: data.title,
    slug: data.slug,
    pageType: data.page_type,
    isPublished: data.is_published,
    sections: data.sections || [],
    draftSections: data.draft_sections || [],
    version: Number(data.version || 1),
    seo: data.seo || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Saves draft sections to a page using Optimistic Concurrency Control (Version CAS).
 * (ADR-003: Prevents concurrent editor sessions from silently overwriting newer edits).
 */
export async function saveDraftSections(
  pageId: string,
  storeId: string,
  sections: SectionConfig[],
  expectedVersion: number
): Promise<{ newVersion: number }> {
  const supabase = await createClient();

  // Validate and sanitize each section configuration
  const validatedSections = sections.map((sec) => validateSectionConfig(sec));

  // Execute Compare-And-Swap (CAS) update
  const { data, error } = await supabase
    .from('pages')
    .update({
      draft_sections: validatedSections,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('store_id', storeId)
    .eq('version', expectedVersion)
    .select('version')
    .maybeSingle();

  if (error) {
    logger.error('Failed to execute draft save CAS update', {
      pageId,
      storeId,
      expectedVersion,
      error: error.message,
    });
    throw new InternalError('حدث خطأ أثناء حفظ مسودة الصفحة.');
  }

  if (!data) {
    // 0 rows modified means the version in the DB differs from expectedVersion
    logger.warn('Optimistic concurrency CAS conflict detected', {
      pageId,
      storeId,
      expectedVersion,
    });
    throw new ConflictError(
      'تم تعديل هذه الصفحة مسبقاً في جلسة أو نافذة أخرى. يرجى تحديث الصفحة لمشاهدة آخر التعديلات.'
    );
  }

  logger.info('Draft sections saved successfully with new version', {
    pageId,
    newVersion: data.version,
  });

  return { newVersion: Number(data.version) };
}

/**
 * Publishes draft sections to live sections.
 */
export async function publishPageSections(
  pageId: string,
  storeId: string
): Promise<{ newVersion: number }> {
  const supabase = await createClient();

  const page = await getPageById(pageId, storeId);

  const { data, error } = await supabase
    .from('pages')
    .update({
      sections: page.draftSections,
      version: page.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('store_id', storeId)
    .eq('version', page.version)
    .select('version')
    .single();

  if (error) {
    logger.error('Failed to publish page sections', { pageId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء نشر الصفحة.');
  }

  logger.info('Page sections published to live storefront', {
    pageId,
    newVersion: data.version,
  });

  return { newVersion: Number(data.version) };
}

/**
 * Discards draft sections and resets them to current live published sections.
 */
export async function discardDraftSections(
  pageId: string,
  storeId: string
): Promise<void> {
  const supabase = await createClient();

  const page = await getPageById(pageId, storeId);

  const { error } = await supabase
    .from('pages')
    .update({
      draft_sections: page.sections,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('store_id', storeId);

  if (error) {
    logger.error('Failed to discard draft sections', { pageId, storeId, error: error.message });
    throw new InternalError('حدث خطأ أثناء إلغاء مسودة التعديلات.');
  }

  logger.info('Draft sections discarded and reset to live revision', { pageId });
}

/**
 * Retrieves all data required for the Store Builder Visual Editor.
 * (Page entity, draft sections, current version, active theme, and available section schemas).
 */
export async function getPageBuilderData(
  pageId: string,
  storeId: string
): Promise<{
  page: Page;
  draftSections: SectionConfig[];
  version: number;
  activeTheme: import('@/lib/types').Theme;
  availableSchemas: import('@/lib/types').SectionSchema[];
}> {
  const { getActiveStoreTheme } = await import('@/lib/services/theme-service');
  const { getAvailableSectionSchemas } = await import('@/lib/theme-engine/section-registry');

  const page = await getPageById(pageId, storeId);
  const activeTheme = await getActiveStoreTheme(storeId);
  const availableSchemas = getAvailableSectionSchemas(activeTheme.themeTemplateId);

  return {
    page,
    draftSections: page.draftSections,
    version: page.version,
    activeTheme,
    availableSchemas,
  };
}

