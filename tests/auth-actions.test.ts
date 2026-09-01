import { describe, it, expect } from 'vitest';
import { signUpAction, signInAction, verifyOtpAction, forgotPasswordAction, updatePasswordAction } from '../src/app/actions/auth';

describe('Authentication Server Actions Boundary', () => {
  it('returns structured VALIDATION_ERROR envelope on invalid signup payload', async () => {
    const result = await signUpAction({
      email: 'invalid-email',
      password: 'short',
      fullName: '',
      organizationName: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toBeDefined();
      expect(result.error.details!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('returns structured VALIDATION_ERROR envelope on invalid verifyOtp payload', async () => {
    const result = await verifyOtpAction({
      email: 'user@example.com',
      token: '12', // Less than 6 digits
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details?.[0]?.field).toBe('token');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on missing credentials for sign in', async () => {
    const result = await signInAction({
      email: 'not-an-email',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('handles forgotPassword action validation safely', async () => {
    const result = await forgotPasswordAction({ email: 'bad-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on weak update password', async () => {
    const result = await updatePasswordAction({ password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details?.[0]?.field).toBe('password');
    }
  });
});
