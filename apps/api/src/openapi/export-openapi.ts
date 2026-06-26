import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { createOpenApiDocument } from './openapi.config';

// Resolves to apps/api/openapi.json from both src/openapi (tsx) and dist/openapi (node).
const OUTPUT_PATH = resolve(__dirname, '..', '..', 'openapi.json');

/**
 * Generates the OpenAPI document from the live Nest application graph and writes
 * it to disk. Consumed by CI (DEVOPS-01) to gate against OpenAPI drift.
 */
async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const document = createOpenApiDocument(app);
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`OpenAPI document written to ${OUTPUT_PATH}`);
}

exportOpenApi().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to export OpenAPI document', error);
  process.exit(1);
});
