'use server';

import { createSafeAction } from '@/lib/validation';
import {
  SignUpSchema,
  SignInSchema,
  VerifyOtpSchema,
  ForgotPasswordSchema,
  UpdatePasswordSchema,
} from '@/lib/schemas/auth';
import {
  signUpMerchant,
  verifySignupOtp,
  signInMerchant,
  signOutMerchant,
  requestPasswordRecovery,
  updateUserPassword,
} from '@/lib/services/auth-service';
import { ActionResult } from '@/lib/types';
import { redirect } from 'next/navigation';

export async function signUpAction(
  rawInput: unknown
): Promise<ActionResult<{ requiresEmailVerification: boolean; userId?: string }>> {
  return createSafeAction(SignUpSchema, rawInput, async (input) => {
    return await signUpMerchant(input);
  });
}

export async function verifyOtpAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(VerifyOtpSchema, rawInput, async (input) => {
    return await verifySignupOtp(input);
  });
}

export async function signInAction(
  rawInput: unknown
): Promise<ActionResult<{ userId: string }>> {
  return createSafeAction(SignInSchema, rawInput, async (input) => {
    return await signInMerchant(input);
  });
}

export async function signOutAction(): Promise<ActionResult<{ success: boolean }>> {
  try {
    await signOutMerchant();
    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'فشل تسجيل الخروج.',
      },
    };
  }
}

export async function forgotPasswordAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(ForgotPasswordSchema, rawInput, async (input) => {
    await requestPasswordRecovery(input.email);
    return { success: true };
  });
}

export async function updatePasswordAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(UpdatePasswordSchema, rawInput, async (input) => {
    await updateUserPassword(input.password);
    return { success: true };
  });
}

export async function handleSignOutAndRedirect(): Promise<void> {
  await signOutMerchant();
  redirect('/login');
}
