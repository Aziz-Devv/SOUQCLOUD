'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { SwitchActiveStoreSchema } from '@/lib/schemas/dashboard';
import { getMerchantStores } from '@/lib/services/store-service';
import { getAuthenticatedSessionContext } from '@/lib/services/auth-service';
import { ACTIVE_STORE_COOKIE_NAME } from '@/lib/services/dashboard-nav-service';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { createSafeAction } from '@/lib/validation';
import { ActionResult } from '@/lib/types';
import { logger } from '@/lib/logger';

/**
 * Action to switch the merchant's active store context.
 * Invariant: The target store ID must strictly belong to the authenticated merchant.
 */
export async function switchActiveStoreAction(
  rawInput: unknown
): Promise<ActionResult<{ activeStoreId: string }>> {
  return createSafeAction(SwitchActiveStoreSchema, rawInput, async (input) => {
    const session = await getAuthenticatedSessionContext();
    if (!session) {
      throw new UnauthorizedError('يجب تسجيل الدخول لتبديل المتجر النشط.');
    }

    const stores = await getMerchantStores();
    const isAuthorized = stores.some((s) => s.id === input.storeId);

    if (!isAuthorized) {
      logger.warn('Unauthorized store switch attempt rejected', {
        userId: session.user.id,
        merchantId: session.merchant.id,
        targetStoreId: input.storeId,
      });
      throw new ForbiddenError('المتجر المطلوب لا يتبع لمنشأتك المصرح بها.');
    }

    const cookieJar = await cookies();
    cookieJar.set(ACTIVE_STORE_COOKIE_NAME, input.storeId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    logger.info('Active store context switched successfully', {
      merchantId: session.merchant.id,
      storeId: input.storeId,
    });

    revalidatePath('/app', 'layout');

    return {
      activeStoreId: input.storeId,
    };
  });
}
