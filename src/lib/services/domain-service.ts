import { createClient } from '@/lib/supabase/server';
import { AppError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { assertValidHostname, normalizeHostname } from '@/lib/domains/validation';
import { getCustomHostnameAdapter } from '@/lib/domains/adapter';
import { CustomDomainDetail, CustomDomainRecord } from '@/lib/domains/types';

function mapRecordToDetail(record: CustomDomainRecord): CustomDomainDetail {
  return {
    id: record.id,
    storeId: record.storeId,
    hostname: record.hostname,
    status: record.status,
    sslStatus: record.sslStatus,
    dnsRecords: {
      txt: record.verificationTxtName && record.verificationTxtValue
        ? {
            name: record.verificationTxtName,
            value: record.verificationTxtValue,
          }
        : null,
      cname: {
        name: record.hostname,
        target: record.cnameTarget,
      },
    },
    lastCheckedAt: record.lastCheckedAt,
    verifiedAt: record.verifiedAt,
    errorMessage: record.errorMessage,
  };
}

/**
 * Attaches a custom domain to a store.
 * Creates custom hostname in Cloudflare and records it in public.custom_domains.
 */
export async function attachStoreCustomDomain(
  storeId: string,
  rawHostname: string
): Promise<CustomDomainDetail> {
  const hostname = assertValidHostname(rawHostname);
  const supabase = await createClient();

  // 1. Check if store already has a custom domain attached
  const { data: existingForStore } = await supabase
    .from('custom_domains')
    .select('id, hostname, status')
    .eq('store_id', storeId)
    .maybeSingle();

  if (existingForStore) {
    throw new ConflictError(
      `المتجر مرتبط بالفعل بالنطاق (${existingForStore.hostname}). يجب إزالة النطاق الحالي قبل إضافة نطاق جديد.`
    );
  }

  // 2. Check if this hostname is already registered by any store
  const { data: duplicateHostname } = await supabase
    .from('custom_domains')
    .select('id')
    .eq('hostname', hostname)
    .maybeSingle();

  if (duplicateHostname) {
    throw new ConflictError('اسم النطاق هذا مسجل بالفعل من قبل متجر آخر');
  }

  // 3. Call Cloudflare Adapter to create Custom Hostname
  const adapter = getCustomHostnameAdapter();
  const cfResult = await adapter.createCustomHostname(hostname);

  // 4. Insert into public.custom_domains operational ledger
  const { data: inserted, error: insertError } = await supabase
    .from('custom_domains')
    .insert({
      store_id: storeId,
      hostname,
      status: cfResult.status,
      ssl_status: cfResult.sslStatus,
      cloudflare_custom_hostname_id: cfResult.customHostnameId,
      verification_txt_name: cfResult.verificationTxtName || null,
      verification_txt_value: cfResult.verificationTxtValue || null,
      cname_target: cfResult.cnameTarget,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    logger.error('Failed to insert custom_domains record', { error: insertError?.message, storeId, hostname });
    // Attempt cleanup on Cloudflare to prevent orphan
    await adapter.deleteCustomHostname(cfResult.customHostnameId).catch(() => {});
    throw new AppError('INTERNAL_ERROR', 'فشل حفظ بيانات النطاق المخصص في قاعدة البيانات', 500);
  }

  // 5. If already active immediately (e.g. mock or pre-verified), sync stores.custom_domain
  if (cfResult.status === 'ACTIVE' && cfResult.sslStatus === 'ACTIVE') {
    await supabase
      .from('stores')
      .update({ custom_domain: hostname, updated_at: new Date().toISOString() })
      .eq('id', storeId);
  }

  const record: CustomDomainRecord = {
    id: inserted.id,
    storeId: inserted.store_id,
    hostname: inserted.hostname,
    status: inserted.status,
    sslStatus: inserted.ssl_status,
    cloudflareCustomHostnameId: inserted.cloudflare_custom_hostname_id,
    verificationTxtName: inserted.verification_txt_name,
    verificationTxtValue: inserted.verification_txt_value,
    cnameTarget: inserted.cname_target,
    lastCheckedAt: inserted.last_checked_at,
    verifiedAt: inserted.verified_at,
    errorMessage: inserted.error_message,
    createdAt: inserted.created_at,
    updatedAt: inserted.updated_at,
  };

  logger.info('Attached custom domain to store', { storeId, hostname, domainId: record.id });
  return mapRecordToDetail(record);
}

/**
 * Queries Cloudflare API for the latest DNS and SSL validation status of a custom domain.
 * Updates public.custom_domains and syncs public.stores.custom_domain upon activation.
 */
export async function verifyStoreCustomDomain(
  storeId: string,
  domainId: string
): Promise<CustomDomainDetail> {
  const supabase = await createClient();

  // 1. Fetch domain record
  const { data: domain, error: fetchError } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('id', domainId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (fetchError || !domain) {
    throw new NotFoundError('النطاق المخصص المطلوب غير موجود');
  }

  const cfHostnameId = domain.cloudflare_custom_hostname_id;
  if (!cfHostnameId) {
    throw new ValidationError('معرف النطاق لدى Cloudflare غير متوفر');
  }

  // 2. Poll Cloudflare Adapter for current status
  const adapter = getCustomHostnameAdapter();
  const cfStatus = await adapter.getCustomHostnameStatus(cfHostnameId);

  const nowIso = new Date().toISOString();
  const isFullyActive = cfStatus.status === 'ACTIVE' && cfStatus.sslStatus === 'ACTIVE';

  // 3. Update public.custom_domains
  const updatePayload: Record<string, unknown> = {
    status: cfStatus.status,
    ssl_status: cfStatus.sslStatus,
    verification_txt_name: cfStatus.verificationTxtName || domain.verification_txt_name,
    verification_txt_value: cfStatus.verificationTxtValue || domain.verification_txt_value,
    error_message: cfStatus.errorMessage || null,
    last_checked_at: nowIso,
    updated_at: nowIso,
  };

  if (isFullyActive && !domain.verified_at) {
    updatePayload.verified_at = nowIso;
  }

  const { data: updated, error: updateError } = await supabase
    .from('custom_domains')
    .update(updatePayload)
    .eq('id', domainId)
    .select('*')
    .single();

  if (updateError || !updated) {
    logger.error('Failed to update custom_domains status', { error: updateError?.message, domainId });
    throw new AppError('INTERNAL_ERROR', 'فشل تحديث حالة النطاق في قاعدة البيانات', 500);
  }

  // 4. Synchronize stores.custom_domain projection
  if (isFullyActive) {
    await supabase
      .from('stores')
      .update({ custom_domain: domain.hostname, updated_at: nowIso })
      .eq('id', storeId);
    logger.info('Custom domain is now ACTIVE, synced stores.custom_domain', { storeId, hostname: domain.hostname });
  } else {
    // If domain status regressed from ACTIVE, clear stores.custom_domain
    const { data: currentStore } = await supabase
      .from('stores')
      .select('custom_domain')
      .eq('id', storeId)
      .single();

    if (currentStore?.custom_domain === domain.hostname) {
      await supabase
        .from('stores')
        .update({ custom_domain: null, updated_at: nowIso })
        .eq('id', storeId);
      logger.warn('Custom domain regressed from ACTIVE, cleared stores.custom_domain', { storeId, hostname: domain.hostname });
    }
  }

  const record: CustomDomainRecord = {
    id: updated.id,
    storeId: updated.store_id,
    hostname: updated.hostname,
    status: updated.status,
    sslStatus: updated.ssl_status,
    cloudflareCustomHostnameId: updated.cloudflare_custom_hostname_id,
    verificationTxtName: updated.verification_txt_name,
    verificationTxtValue: updated.verification_txt_value,
    cnameTarget: updated.cname_target,
    lastCheckedAt: updated.last_checked_at,
    verifiedAt: updated.verified_at,
    errorMessage: updated.error_message,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };

  return mapRecordToDetail(record);
}

/**
 * Removes and releases a custom domain from a store.
 * Deletes hostname from Cloudflare, removes database record, and resets stores.custom_domain = NULL.
 */
export async function removeStoreCustomDomain(
  storeId: string,
  domainId: string
): Promise<void> {
  const supabase = await createClient();

  // 1. Fetch domain record
  const { data: domain, error: fetchError } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('id', domainId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (fetchError || !domain) {
    throw new NotFoundError('النطاق المخصص المطلوب غير موجود');
  }

  // 2. Call Cloudflare Adapter to delete hostname
  if (domain.cloudflare_custom_hostname_id) {
    const adapter = getCustomHostnameAdapter();
    await adapter.deleteCustomHostname(domain.cloudflare_custom_hostname_id).catch((err) => {
      logger.warn('Cloudflare deleteCustomHostname non-blocking error during removal', {
        error: err.message,
        cfId: domain.cloudflare_custom_hostname_id,
      });
    });
  }

  // 3. Delete database record from public.custom_domains
  const { error: deleteError } = await supabase
    .from('custom_domains')
    .delete()
    .eq('id', domainId);

  if (deleteError) {
    logger.error('Failed to delete custom_domains record', { error: deleteError.message, domainId });
    throw new AppError('INTERNAL_ERROR', 'فشل حذف سجل النطاق المخصص من قاعدة البيانات', 500);
  }

  // 4. Atomically clear stores.custom_domain if it matches
  await supabase
    .from('stores')
    .update({ custom_domain: null, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .eq('custom_domain', domain.hostname);

  logger.info('Successfully removed custom domain', { storeId, hostname: domain.hostname, domainId });
}

/**
 * Retrieves the current custom domain details for a merchant store.
 */
export async function getStoreCustomDomain(
  storeId: string
): Promise<CustomDomainDetail | null> {
  const supabase = await createClient();

  const { data: domain, error } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle();

  if (error || !domain) {
    return null;
  }

  const record: CustomDomainRecord = {
    id: domain.id,
    storeId: domain.store_id,
    hostname: domain.hostname,
    status: domain.status,
    sslStatus: domain.ssl_status,
    cloudflareCustomHostnameId: domain.cloudflare_custom_hostname_id,
    verificationTxtName: domain.verification_txt_name,
    verificationTxtValue: domain.verification_txt_value,
    cnameTarget: domain.cname_target,
    lastCheckedAt: domain.last_checked_at,
    verifiedAt: domain.verified_at,
    errorMessage: domain.error_message,
    createdAt: domain.created_at,
    updatedAt: domain.updated_at,
  };

  return mapRecordToDetail(record);
}

/**
 * Resolves a store ID and handle by active custom domain hostname via hardened RPC.
 * Used for public storefront edge routing.
 */
export async function resolveStoreByCustomDomain(
  rawHostname: string
): Promise<{ storeId: string; handle: string; storeName: string; storeStatus: string } | null> {
  const hostname = normalizeHostname(rawHostname);
  if (!hostname) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('resolve_store_by_custom_domain', {
    p_hostname: hostname,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const result = data[0];
  return {
    storeId: result.store_id,
    handle: result.handle,
    storeName: result.store_name,
    storeStatus: result.store_status,
  };
}
