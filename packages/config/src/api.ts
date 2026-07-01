import { z } from 'zod';

import { parseEnv } from './env';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim())),

  SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  SUPABASE_ANON_KEY: z
    .string()
    .default('dev-anon-key')
    .transform((value) => value || 'dev-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .default('dev-service-role-key')
    .transform((value) => value || 'dev-service-role-key'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@127.0.0.1:54322/postgres'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),

  JWT_AUDIENCE: z.string().default('authenticated'),
  JWT_ISSUER: z.string().default('supabase'),
  /** Phone or email of the account granted super_admin on bootstrap seed. */
  ADMIN_BOOTSTRAP_IDENTIFIER: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.enum(['twilio', 'local']).default('twilio'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  FCM_SERVER_KEY: z.string().optional(),

  EASYPAISA_MERCHANT_ID: z.string().optional(),
  EASYPAISA_API_KEY: z.string().optional(),
  JAZZCASH_MERCHANT_ID: z.string().optional(),
  JAZZCASH_PASSWORD: z.string().optional(),
  JAZZCASH_INTEGRITY_SALT: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  POSTHOG_API_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_STUB_SECRET: z
    .string()
    .default('dev-payment-stub-secret')
    .transform((value) => value || 'dev-payment-stub-secret'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function getApiEnv(env: Record<string, string | undefined> = process.env): ApiEnv {
  return parseEnv(apiEnvSchema, env);
}
