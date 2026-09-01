import { z } from 'zod';

/**
 * Dashboard & Navigation Validation Schemas
 * Source of Truth: docs/03-modules/dashboard-shell.md, docs/04-ux-ui/dashboard-ux.md
 */

export const SwitchActiveStoreSchema = z.object({
  storeId: z.string().uuid({ message: 'معرف المتجر غير صالح' }),
});

export type SwitchActiveStoreInput = z.infer<typeof SwitchActiveStoreSchema>;
