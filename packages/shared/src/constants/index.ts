export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const REGIONS = {
  PK: { code: 'PK', currency: 'PKR', defaultLocale: 'en' },
  US: { code: 'US', currency: 'USD', defaultLocale: 'en' },
} as const;

export const USER_ROLES = [
  'super_admin',
  'support_agent',
  'breeder',
  'animal_owner',
  'veterinarian',
  'inspector',
  'buyer',
] as const;

export const SPECIES = ['cattle', 'buffalo', 'goat', 'sheep', 'dog'] as const;

export const STORAGE_BUCKETS = [
  'animal-media',
  'health-records',
  'pedigree-documents',
  'payment-proofs',
  'verification-evidence',
] as const;

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export * from './auth';
export * from './animal';
export * from './listing';
export * from './breeding';
