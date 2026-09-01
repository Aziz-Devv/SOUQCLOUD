'use server';

import {
  ActivateThemeSchema,
  UpdateDesignTokensSchema,
  SaveDraftSectionsSchema,
  PublishPageSectionsSchema,
  DiscardDraftSectionsSchema,
} from '@/lib/schemas/theme';
import {
  activateTheme,
  updateThemeDesignTokens,
} from '@/lib/services/theme-service';
import {
  saveDraftSections,
  publishPageSections,
  discardDraftSections,
} from '@/lib/services/page-service';
import { ActionResult } from '@/lib/types';
import { createSafeAction } from '@/lib/validation';

export async function activateThemeAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(ActivateThemeSchema, rawInput, async (input) => {
    await activateTheme(input.storeId, input.themeId);
    return { success: true };
  });
}

export async function updateDesignTokensAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(UpdateDesignTokensSchema, rawInput, async (input) => {
    await updateThemeDesignTokens(input.themeId, input.storeId, input.tokens);
    return { success: true };
  });
}

export async function saveDraftSectionsAction(
  rawInput: unknown
): Promise<ActionResult<{ newVersion: number }>> {
  return createSafeAction(SaveDraftSectionsSchema, rawInput, async (input) => {
    return await saveDraftSections(
      input.pageId,
      input.storeId,
      input.sections,
      input.expectedVersion
    );
  });
}

export async function publishPageSectionsAction(
  rawInput: unknown
): Promise<ActionResult<{ newVersion: number }>> {
  return createSafeAction(PublishPageSectionsSchema, rawInput, async (input) => {
    return await publishPageSections(input.pageId, input.storeId);
  });
}

export async function discardDraftSectionsAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(DiscardDraftSectionsSchema, rawInput, async (input) => {
    await discardDraftSections(input.pageId, input.storeId);
    return { success: true };
  });
}

export async function getPageBuilderDataAction(
  rawInput: unknown
): Promise<
  ActionResult<{
    page: import('@/lib/types').Page;
    draftSections: import('@/lib/types').SectionConfig[];
    version: number;
    activeTheme: import('@/lib/types').Theme;
    availableSchemas: import('@/lib/types').SectionSchema[];
  }>
> {
  const { GetPageBuilderDataSchema } = await import('@/lib/schemas/theme');
  const { getPageBuilderData } = await import('@/lib/services/page-service');

  return createSafeAction(GetPageBuilderDataSchema, rawInput, async (input) => {
    return await getPageBuilderData(input.pageId, input.storeId);
  });
}

