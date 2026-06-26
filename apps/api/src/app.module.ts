import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigModule } from './config/app-config.module';
import { BreedsModule } from './modules/breeds/breeds.module';
import { HealthModule } from './modules/health/health.module';
import { RegionsModule } from './modules/regions/regions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AppConfigModule,
    HealthModule,
    RegionsModule,
    BreedsModule,
  ],
})
export class AppModule {}
