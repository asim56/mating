import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { API_PREFIX } from '@mating/shared';

import { AppModule } from './app.module';
import { AllExceptionsFilter, buildValidationPipe } from './common';
import { setupSwagger } from './openapi/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''));
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();

  setupSwagger(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
