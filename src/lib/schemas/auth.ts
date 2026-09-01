import { z } from 'zod';

/**
 * Authentication & Identity Zod Validation Schemas
 * Source of Truth: docs/03-modules/auth.md, docs/06-process/CODING_STANDARDS.md
 */

export const SignUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صالح'),
  password: z
    .string()
    .min(8, 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'),
  fullName: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون الاسم الكامل من حرفين على الأقل')
    .max(100, 'الاسم طويل جداً'),
  organizationName: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون اسم النشاط التجاري من حرفين على الأقل')
    .max(100, 'اسم النشاط التجاري طويل جداً'),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صالح'),
  password: z
    .string()
    .min(1, 'كلمة المرور مطلوبة'),
});

export type SignInInput = z.infer<typeof SignInSchema>;

export const VerifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صالح'),
  token: z
    .string()
    .trim()
    .length(6, 'رمز التحقق يجب أن يتكون من 6 أرقام')
    .regex(/^\d+$/, 'رمز التحقق يجب أن يحتوي على أرقام فقط'),
  type: z.literal('email').default('email'),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صالح'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'),
});

export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
