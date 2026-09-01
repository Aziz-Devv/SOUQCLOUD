import { createClient } from '../supabase/server';
import {
  AuthSessionContext,
  Membership,
  Merchant,
  UserProfile,
} from '../types';
import {
  SignUpInput,
  SignInInput,
  VerifyOtpInput,
} from '../schemas/auth';
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  InternalError,
} from '../errors';
import { logger } from '../logger';
import { dispatchNotification } from './notification-service';

/**
 * Generates a clean URL-safe merchant slug from an organization name.
 * Handles English, Arabic, and mixed text deterministically.
 */
export function generateMerchantSlug(name: string, suffix?: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0621-\u064A-]/g, '') // keep alphanumeric, spaces, Arabic chars, hyphens
    .replace(/\s+/g, '-') // collapse spaces to hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // strip leading and trailing hyphens

  // If slug contains non-ASCII (e.g. Arabic only) and ends up empty or raw, provide a clean base
  if (!slug || slug === '-') {
    slug = 'merchant';
  }

  if (suffix) {
    slug = `${slug}-${suffix}`;
  }

  return slug.substring(0, 200);
}

/**
 * Registers a new merchant through Supabase Auth.
 * PostgreSQL trigger `on_auth_user_created` creates `public.users` automatically.
 */
export async function signUpMerchant(input: SignUpInput): Promise<{
  requiresEmailVerification: boolean;
  userId?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        initial_org_name: input.organizationName,
      },
    },
  });

  if (error) {
    logger.warn('Merchant sign-up failed in Supabase Auth', {
      email: input.email,
      error: error.message,
    });

    if (error.message.toLowerCase().includes('already registered')) {
      throw new ConflictError('البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
    }
    throw new ValidationError(error.message);
  }

  const user = data.user;
  const session = data.session;

  // Non-blocking AUTH_VERIFY_EMAIL dispatch (store_id = null)
  void dispatchNotification({
    storeId: null,
    recipient: input.email.trim(),
    channel: 'EMAIL',
    eventType: 'AUTH_VERIFY_EMAIL',
    payload: {
      userEmail: input.email.trim(),
      verificationUrl: '/verify',
    },
  }).catch((err: unknown) => {
    logger.warn('Non-blocking auth verify email notification error', {
      email: input.email,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // If session is immediately returned (e.g. email confirmation disabled in dev), provision organization immediately
  if (session && user) {
    await provisionMerchantAndOwner(input.organizationName);
    return {
      requiresEmailVerification: false,
      userId: user.id,
    };
  }

  return {
    requiresEmailVerification: true,
    userId: user?.id,
  };
}

/**
 * Verifies email OTP token using the canonical Supabase Email OTP contract.
 */
export async function verifySignupOtp(input: VerifyOtpInput): Promise<{
  success: boolean;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: 'email', // Canonical Supabase Email OTP contract
  });

  if (error || !data.user) {
    logger.warn('Email OTP verification failed', {
      email: input.email,
      error: error?.message,
    });
    throw new ValidationError('رمز التحقق غير صحيح أو منتهي الصلاحية.');
  }

  // Provision initial Merchant and OWNER Membership idempotently
  const orgName = (data.user.user_metadata?.initial_org_name as string) || 'متجري';
  await provisionMerchantAndOwner(orgName);

  return { success: true };
}

/**
 * Authenticates merchant with email and password.
 */
export async function signInMerchant(input: SignInInput): Promise<{
  userId: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    logger.warn('Merchant sign-in failed', {
      email: input.email,
      error: error?.message,
    });
    throw new UnauthorizedError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }

  // Idempotency check: Ensure merchant organization is provisioned
  const orgName = (data.user.user_metadata?.initial_org_name as string) || 'متجري';
  await provisionMerchantAndOwner(orgName);

  return { userId: data.user.id };
}

/**
 * Terminates the active user session.
 */
export async function signOutMerchant(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('Error during signOut', { error: error.message });
    throw new InternalError('حدث خطأ أثناء تسجيل الخروج.');
  }
}

/**
 * Requests password recovery email.
 */
export async function requestPasswordRecovery(email: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    logger.warn('Password recovery request failed', { email, error: error.message });
    // Do not leak email existence to prevent account enumeration
  }

  // Non-blocking AUTH_PASSWORD_RESET dispatch (store_id = null)
  void dispatchNotification({
    storeId: null,
    recipient: email.trim(),
    channel: 'EMAIL',
    eventType: 'AUTH_PASSWORD_RESET',
    payload: {
      userEmail: email.trim(),
      resetUrl: '/reset-password',
    },
  }).catch((err: unknown) => {
    logger.warn('Non-blocking auth password reset notification error', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Updates the password for the current recovery or authenticated session.
 */
export async function updateUserPassword(password: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    logger.warn('Password update failed', { error: error.message });
    throw new ValidationError(error.message || 'فشل تحديث كلمة المرور.');
  }
}

/**
 * Idempotent server-side merchant and OWNER membership provisioning.
 * Uses authenticated user session exclusively.
 */
export async function provisionMerchantAndOwner(organizationName: string): Promise<{
  merchant: Merchant;
  membership: Membership;
}> {
  const supabase = await createClient();

  // 1. Authenticate user from session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('يجب تسجيل الدخول لإتمام عملية التهيئة.');
  }

  // 2. Idempotency check: Check if user already holds an active OWNER membership
  const { data: existingMemberships, error: memError } = await supabase
    .from('memberships')
    .select('*, merchants(*)')
    .eq('user_id', user.id)
    .eq('role', 'OWNER')
    .eq('status', 'ACTIVE')
    .limit(1);

  if (!memError && existingMemberships && existingMemberships.length > 0) {
    const existing = existingMemberships[0]!;
    const merchantData = existing.merchants as unknown as Record<string, unknown>;

    return {
      merchant: {
        id: merchantData.id as string,
        name: merchantData.name as string,
        slug: merchantData.slug as string,
        status: merchantData.status as Merchant['status'],
        settings: (merchantData.settings as Record<string, unknown>) || {},
        createdAt: merchantData.created_at as string,
        updatedAt: merchantData.updated_at as string,
      },
      membership: {
        id: existing.id,
        merchantId: existing.merchant_id,
        userId: existing.user_id,
        role: existing.role,
        status: existing.status,
        permissions: existing.permissions || {},
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      },
    };
  }

  // 3. Generate a collision-safe slug
  const baseSlug = generateMerchantSlug(organizationName);
  let finalSlug = baseSlug;

  // Check if slug exists
  const { data: slugMatch } = await supabase
    .from('merchants')
    .select('id')
    .eq('slug', finalSlug)
    .maybeSingle();

  if (slugMatch) {
    finalSlug = generateMerchantSlug(organizationName, crypto.randomUUID().slice(0, 6));
  }

  // 4. Create Merchant Organization
  const { data: newMerchant, error: createMerchantError } = await supabase
    .from('merchants')
    .insert({
      name: organizationName,
      slug: finalSlug,
      status: 'TRIAL',
      settings: {},
    })
    .select()
    .single();

  if (createMerchantError || !newMerchant) {
    logger.error('Failed to insert merchant organization', {
      user_id: user.id,
      error: createMerchantError?.message,
    });
    throw new InternalError('فشل إنشاء النشاط التجاري.');
  }

  // 5. Create OWNER Membership
  const { data: newMembership, error: createMembershipError } = await supabase
    .from('memberships')
    .insert({
      merchant_id: newMerchant.id,
      user_id: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: {},
    })
    .select()
    .single();

  if (createMembershipError || !newMembership) {
    logger.error('Failed to insert OWNER membership', {
      merchant_id: newMerchant.id,
      user_id: user.id,
      error: createMembershipError?.message,
    });
    throw new InternalError('فشل إنشاء عضوية المالك.');
  }

  return {
    merchant: {
      id: newMerchant.id,
      name: newMerchant.name,
      slug: newMerchant.slug,
      status: newMerchant.status,
      settings: newMerchant.settings || {},
      createdAt: newMerchant.created_at,
      updatedAt: newMerchant.updated_at,
    },
    membership: {
      id: newMembership.id,
      merchantId: newMembership.merchant_id,
      userId: newMembership.user_id,
      role: newMembership.role,
      status: newMembership.status,
      permissions: newMembership.permissions || {},
      createdAt: newMembership.created_at,
      updatedAt: newMembership.updated_at,
    },
  };
}

/**
 * Retrieves the full authenticated session context (User + Active Merchant + Role).
 * Returns null if not authenticated.
 */
export async function getAuthenticatedSessionContext(): Promise<AuthSessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // 1. Fetch Application User Profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    logger.warn('User profile missing in public.users', { user_id: authUser.id });
    return null;
  }

  // 2. Fetch Active Membership
  const { data: membershipData, error: memError } = await supabase
    .from('memberships')
    .select('*, merchants(*)')
    .eq('user_id', authUser.id)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  if (memError || !membershipData || !membershipData.merchants) {
    return null;
  }

  const merchantData = membershipData.merchants as unknown as Record<string, unknown>;

  const user: UserProfile = {
    id: userProfile.id,
    email: userProfile.email,
    fullName: userProfile.full_name || '',
    avatarUrl: userProfile.avatar_url,
    createdAt: userProfile.created_at,
    updatedAt: userProfile.updated_at,
  };

  const merchant: Merchant = {
    id: merchantData.id as string,
    name: merchantData.name as string,
    slug: merchantData.slug as string,
    status: merchantData.status as Merchant['status'],
    settings: (merchantData.settings as Record<string, unknown>) || {},
    createdAt: merchantData.created_at as string,
    updatedAt: merchantData.updated_at as string,
  };

  const membership: Membership = {
    id: membershipData.id,
    merchantId: membershipData.merchant_id,
    userId: membershipData.user_id,
    role: membershipData.role,
    status: membershipData.status,
    permissions: membershipData.permissions || {},
    createdAt: membershipData.created_at,
    updatedAt: membershipData.updated_at,
  };

  return { user, merchant, membership };
}
