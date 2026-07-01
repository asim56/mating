export const PK_PHONE_REGEX = /^\+92\d{10}$/;
export const US_PHONE_REGEX = /^\+1\d{10}$/;

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const PASSWORD_MIN_LENGTH = 10;
export const ACCESS_TOKEN_TTL_SECONDS = 60;

export const SELF_SELECTABLE_ROLES = ['buyer', 'breeder', 'animal_owner'] as const;
export const ADMIN_ONLY_ROLES = [
  'super_admin',
  'support_agent',
  'field_onboarding_rep',
  'veterinarian',
  'inspector',
] as const;

export const ACCOUNT_STATUSES = ['active', 'suspended'] as const;
export const SESSION_STATUSES = ['active', 'revoked'] as const;

export const DISALLOWED_ANALYTICS_KEYS = [
  'phone',
  'email',
  'password',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
] as const;
