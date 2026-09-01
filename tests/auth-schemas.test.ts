import { describe, it, expect } from 'vitest';
import {
  SignUpSchema,
  SignInSchema,
  VerifyOtpSchema,
  ForgotPasswordSchema,
  UpdatePasswordSchema,
} from '../src/lib/schemas/auth';

describe('Authentication Zod Validation Schemas', () => {
  describe('SignUpSchema', () => {
    it('accepts valid signup input', () => {
      const result = SignUpSchema.safeParse({
        email: 'merchant@example.com',
        password: 'Password123',
        fullName: 'Aziz Alahmad',
        organizationName: 'Aura Studio',
      });

      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = SignUpSchema.safeParse({
        email: 'merchant@example.com',
        password: 'Pass1',
        fullName: 'Aziz Alahmad',
        organizationName: 'Aura Studio',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('8 أحرف');
      }
    });

    it('rejects passwords without numbers or uppercase letters', () => {
      const result = SignUpSchema.safeParse({
        email: 'merchant@example.com',
        password: 'passwordonly',
        fullName: 'Aziz Alahmad',
        organizationName: 'Aura Studio',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = SignUpSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
        fullName: 'Aziz',
        organizationName: 'Aura',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty organization name', () => {
      const result = SignUpSchema.safeParse({
        email: 'merchant@example.com',
        password: 'Password123',
        fullName: 'Aziz',
        organizationName: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('SignInSchema', () => {
    it('accepts valid credentials', () => {
      const result = SignInSchema.safeParse({
        email: 'merchant@example.com',
        password: 'Password123',
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = SignInSchema.safeParse({
        email: 'merchant@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('VerifyOtpSchema', () => {
    it('accepts 6-digit numeric token and enforces type="email"', () => {
      const result = VerifyOtpSchema.safeParse({
        email: 'merchant@example.com',
        token: '123456',
        type: 'email',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('email');
      }
    });

    it('defaults type to "email" if omitted', () => {
      const result = VerifyOtpSchema.safeParse({
        email: 'merchant@example.com',
        token: '654321',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('email');
      }
    });

    it('rejects non-numeric or non-6-digit tokens', () => {
      const shortToken = VerifyOtpSchema.safeParse({
        email: 'merchant@example.com',
        token: '123',
      });
      expect(shortToken.success).toBe(false);

      const letterToken = VerifyOtpSchema.safeParse({
        email: 'merchant@example.com',
        token: 'abcdef',
      });
      expect(letterToken.success).toBe(false);
    });
  });

  describe('ForgotPasswordSchema & UpdatePasswordSchema', () => {
    it('validates email for password reset', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'user@souqcloud.com' }).success).toBe(true);
      expect(ForgotPasswordSchema.safeParse({ email: 'bad-email' }).success).toBe(false);
    });

    it('validates new password strength', () => {
      expect(UpdatePasswordSchema.safeParse({ password: 'StrongPassword1' }).success).toBe(true);
      expect(UpdatePasswordSchema.safeParse({ password: 'weak' }).success).toBe(false);
    });
  });
});
