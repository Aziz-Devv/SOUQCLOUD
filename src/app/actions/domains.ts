'use server';

import { createSafeAction } from '@/lib/validation';
import {
  AttachCustomDomainSchema,
  VerifyCustomDomainSchema,
  RemoveCustomDomainSchema,
  CustomDomainDetail,
} from '@/lib/domains/types';
import {
  attachStoreCustomDomain,
  verifyStoreCustomDomain,
  removeStoreCustomDomain,
  getStoreCustomDomain,
} from '@/lib/services/domain-service';
import { getAuthenticatedSessionContext } from '@/lib/services/auth-service';
import { ActionResult } from '@/lib/types';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { z } from 'zod';

/**
 * Server-side role guard for domain mutations.
 * Restricts mutation actions to OWNER and ADMIN roles.
 */
async function assertDomainMutationPermission() {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    throw new UnauthorizedError('يجب تسجيل الدخول لإتمام هذه العملية');
  }
  if (session.membership.role === 'STAFF') {
    throw new ForbiddenError('غير مصرح لك بإدارة أو تعديل النطاق المخصص للمتجر. هذه الصلاحية للمالك والمسؤولين فقط.');
  }
  return session;
}

export async function attachCustomDomainAction(
  rawInput: unknown
): Promise<ActionResult<CustomDomainDetail>> {
  return createSafeAction(AttachCustomDomainSchema, rawInput, async (input) => {
    await assertDomainMutationPermission();
    return await attachStoreCustomDomain(input.storeId, input.hostname);
  });
}

export async function verifyCustomDomainAction(
  rawInput: unknown
): Promise<ActionResult<CustomDomainDetail>> {
  return createSafeAction(VerifyCustomDomainSchema, rawInput, async (input) => {
    await assertDomainMutationPermission();
    return await verifyStoreCustomDomain(input.storeId, input.domainId);
  });
}

export async function removeCustomDomainAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(RemoveCustomDomainSchema, rawInput, async (input) => {
    await assertDomainMutationPermission();
    await removeStoreCustomDomain(input.storeId, input.domainId);
    return { success: true };
  });
}

const GetCustomDomainSchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
});

export async function getCustomDomainAction(
  rawInput: unknown
): Promise<ActionResult<CustomDomainDetail | null>> {
  return createSafeAction(GetCustomDomainSchema, rawInput, async (input) => {
    await getAuthenticatedSessionContext();
    return await getStoreCustomDomain(input.storeId);
  });
}
