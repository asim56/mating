import { z } from 'zod';

import { localeSchema, regionCodeSchema, parseEnv } from './env';

export const webEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default('dev-anon-key'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_DEFAULT_REGION: regionCodeSchema.default('PK'),
  NEXT_PUBLIC_DEFAULT_LOCALE: localeSchema.default('en'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function getWebEnv(env: Record<string, string | undefined> = process.env): WebEnv {
  return parseEnv(webEnvSchema, env);
}
