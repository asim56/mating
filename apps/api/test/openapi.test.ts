import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { buildOpenApiConfig, createOpenApiDocument } from '../src/openapi/openapi.config';

test('OpenAPI config carries title and version', () => {
  const config = buildOpenApiConfig();
  assert.equal(config.info.title, 'Mating Marketplace API');
  assert.ok(config.info.version.length > 0);
});

test('OpenAPI document generates and serializes with the health path', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  try {
    const document = createOpenApiDocument(app);
    assert.ok(document.openapi.startsWith('3.'));

    const json = JSON.stringify(document);
    assert.ok(json.length > 0);

    const paths = Object.keys(document.paths);
    assert.ok(
      paths.some((path) => path.includes('/health')),
      `expected a /health path, got: ${paths.join(', ')}`,
    );
    assert.ok(
      paths.some((path) => path.includes('/breeding-requests')),
      `expected breeding-requests paths, got: ${paths.join(', ')}`,
    );
    assert.ok(
      paths.some((path) => path.includes('/conversations')),
      `expected conversations paths, got: ${paths.join(', ')}`,
    );
    assert.ok(
      paths.some((path) => path.includes('/payments')),
      `expected payments paths, got: ${paths.join(', ')}`,
    );
    assert.ok(
      paths.some((path) => path.includes('/ledger')),
      `expected ledger paths, got: ${paths.join(', ')}`,
    );
    assert.ok(
      paths.some((path) => path.includes('/verifications')),
      `expected verifications paths, got: ${paths.join(', ')}`,
    );
  } finally {
    await app.close();
  }
});
