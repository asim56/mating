import { z } from 'zod';

export const regionCodeSchema = z.enum(['PK', 'US']);
export const localeSchema = z.enum(['en', 'ur']);

export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;

export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted)}`);
  }
  return result.data;
}
