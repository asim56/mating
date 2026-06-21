import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getApiEnv, type ApiEnv } from '@mating/config';

export const API_ENV = 'API_ENV';

@Global()
@Module({
  providers: [
    {
      provide: API_ENV,
      inject: [ConfigService],
      useFactory: (): ApiEnv => getApiEnv(process.env),
    },
  ],
  exports: [API_ENV],
})
export class AppConfigModule {}
