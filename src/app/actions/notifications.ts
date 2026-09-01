'use server';

import { createSafeAction } from '@/lib/validation';
import {
  NotificationFilterSchema,
  NotificationFilterInput,
} from '@/lib/schemas/notifications';
import { getStoreNotifications } from '@/lib/services/notification-service';
import { ActionResult } from '@/lib/types';
import { NotificationRecord } from '@/lib/notifications/types';

export async function getStoreNotificationsAction(
  storeId: string,
  rawFilters?: unknown
): Promise<ActionResult<{ notifications: NotificationRecord[]; total: number }>> {
  return createSafeAction(
    NotificationFilterSchema.optional(),
    rawFilters || {},
    async (filters) => {
      const result = await getStoreNotifications(
        storeId,
        filters as NotificationFilterInput
      );
      return {
        notifications: result.notifications,
        total: result.total,
      };
    }
  );
}
