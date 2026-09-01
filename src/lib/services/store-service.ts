import { createClient } from '@/lib/supabase/server';
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { Store, StoreSummary } from '@/lib/types';
import { CheckHandleSchema, CreateStoreSchemaInput } from '@/lib/schemas/store';
import { normalizePhoneNumber } from '@/lib/utils/phone';
import { getAuthenticatedSessionContext } from '@/lib/services/auth-service';

/**
 * Checks whether a given subdomain handle is available.
 */
export async function checkStoreHandleAvailability(
  handle: string
): Promise<{ available: boolean; reason?: string }> {
  const parsed = CheckHandleSchema.safeParse({ handle });
  if (!parsed.success) {
    return {
      available: false,
      reason: parsed.error.issues[0]?.message || 'معرّف المتجر غير صالح',
    };
  }

  const normalizedHandle = handle.trim().toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stores')
    .select('id')
    .eq('handle', normalizedHandle)
    .maybeSingle();

  if (error) {
    logger.error('Error checking store handle availability', {
      handle: normalizedHandle,
      error: error.message,
    });
    throw new InternalError('حدث خطأ أثناء التحقق من توفر المعرّف.');
  }

  if (data) {
    return {
      available: false,
      reason: 'معرّف المتجر محجوز بالفعل لمستخدم آخر',
    };
  }

  return { available: true };
}

/**
 * Creates a new Store under the authenticated user's merchant organization.
 * Invariant: Caller must possess an ACTIVE 'OWNER' or 'ADMIN' membership.
 */
export async function createMerchantStore(
  input: CreateStoreSchemaInput
): Promise<{ storeId: string; handle: string; store: Store }> {
  // 1. Resolve authenticated user and merchant membership
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    throw new NotFoundError('لم يتم العثور على جلسة مستخدم نشطة.');
  }

  const { merchant, membership } = session;

  // 2. Authorization guard: Only OWNER or ADMIN may create a store
  if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    throw new ForbiddenError('فقط مالك المنظمة أو المدير يمكنهم إنشاء متجر جديد.');
  }

  const normalizedHandle = input.handle.trim().toLowerCase();

  // 3. Check Handle uniqueness
  const availability = await checkStoreHandleAvailability(normalizedHandle);
  if (!availability.available) {
    throw new ConflictError(availability.reason || 'معرّف المتجر مستخدم بالفعل.');
  }

  // 4. Normalize WhatsApp phone number if provided
  let normalizedPhone: string | null = null;
  if (input.whatsappPhone && input.whatsappPhone.trim().length > 0) {
    const norm = normalizePhoneNumber(
      input.whatsappPhone,
      input.defaultCountryCode
    );
    if (!norm.success) {
      throw new ValidationError(norm.error);
    }
    normalizedPhone = norm.phone;
  }

  const supabase = await createClient();

  // 5. Insert new store in DRAFT status
  const { data: storeRow, error: insertError } = await supabase
    .from('stores')
    .insert({
      merchant_id: merchant.id,
      name: input.name.trim(),
      handle: normalizedHandle,
      currency: input.currency || 'SAR',
      default_locale: input.defaultLocale || 'ar',
      default_country_code: input.defaultCountryCode.toUpperCase(),
      status: 'DRAFT',
      order_mode: input.orderMode || 'BOTH',
      whatsapp_phone: normalizedPhone,
      whatsapp_settings: {
        auto_redirect: true,
        custom_message_template: null,
      },
      order_sequence_counter: 1000,
      settings: {
        shipping: {
          flat_rate_cents: 500,
          free_shipping_threshold_cents: null,
        },
        tax: {
          tax_rate_basis_points: 0,
          tax_included_in_price: false,
        },
        branding: {
          logo_url: null,
          favicon_url: null,
          social_links: {},
        },
      },
    })
    .select('*')
    .single();

  if (insertError) {
    logger.error('Failed to create store record', {
      merchantId: merchant.id,
      handle: normalizedHandle,
      error: insertError.message,
    });
    if (insertError.code === '23505') {
      throw new ConflictError('معرّف المتجر مستخدم بالفعل.');
    }
    throw new InternalError('حدث خطأ أثناء إنشاء المتجر.');
  }

  logger.info('Store created successfully', {
    storeId: storeRow.id,
    merchantId: merchant.id,
    handle: storeRow.handle,
    status: storeRow.status,
  });

  const createdStore: Store = {
    id: storeRow.id,
    merchantId: storeRow.merchant_id,
    name: storeRow.name,
    handle: storeRow.handle,
    customDomain: storeRow.custom_domain,
    currency: storeRow.currency,
    defaultLocale: storeRow.default_locale,
    defaultCountryCode: storeRow.default_country_code,
    status: storeRow.status,
    orderMode: storeRow.order_mode,
    whatsappPhone: storeRow.whatsapp_phone,
    whatsappSettings: storeRow.whatsapp_settings,
    orderSequenceCounter: storeRow.order_sequence_counter,
    settings: storeRow.settings,
    createdAt: storeRow.created_at,
    updatedAt: storeRow.updated_at,
  };

  return {
    storeId: createdStore.id,
    handle: createdStore.handle,
    store: createdStore,
  };
}

/**
 * Retrieves all stores accessible to the active merchant organization.
 */
export async function getMerchantStores(): Promise<StoreSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stores')
    .select(
      'id, merchant_id, name, handle, custom_domain, currency, default_locale, default_country_code, status, order_mode, whatsapp_phone, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch merchant stores', { error: error.message });
    throw new InternalError('حدث خطأ أثناء استرجاع بيانات المتاجر.');
  }

  return (data || []).map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    handle: row.handle,
    customDomain: row.custom_domain,
    currency: row.currency,
    defaultLocale: row.default_locale,
    defaultCountryCode: row.default_country_code,
    status: row.status,
    orderMode: row.order_mode,
    whatsappPhone: row.whatsapp_phone,
    createdAt: row.created_at,
  }));
}
