import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const OPENAPI_DOCS_PATH = 'docs';

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Mating Marketplace API')
    .setDescription('REST API for the animal breeding marketplace')
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .addBearerAuth()
    .build();
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig());
}

export function setupSwagger(app: INestApplication): OpenAPIObject {
  const document = createOpenApiDocument(app);
  SwaggerModule.setup(OPENAPI_DOCS_PATH, app, document);
  return document;
}
