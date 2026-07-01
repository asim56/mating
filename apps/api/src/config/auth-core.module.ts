import { Global, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';

import type { ApiEnv } from '@mating/config';

import { AccountStatusGuard } from '../common/auth/account-status.guard';
import {
  JwtAuthGuard,
  StructuralTokenVerifier,
  TOKEN_VERIFIER,
} from '../common/auth/jwt.guard';
import { JwksTokenVerifier } from '../common/auth/jwks-token-verifier';
import { RolesGuard } from '../common/auth/roles.guard';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { SupabaseModule } from '../infra/supabase/supabase.module';
import { API_ENV } from './app-config.module';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) =>
        env.NODE_ENV === 'test'
          ? new StructuralTokenVerifier()
          : new JwksTokenVerifier(env.SUPABASE_URL, env.JWT_ISSUER, env.JWT_AUDIENCE),
    },
    JwtAuthGuard,
    RolesGuard,
    AccountStatusGuard,
    {
      provide: RateLimitGuard,
      useFactory: (reflector: Reflector) => new RateLimitGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: JwtAuthGuard,
      useFactory: (reflector: Reflector, env: ApiEnv) => {
        const verifier =
          env.NODE_ENV === 'test'
            ? new StructuralTokenVerifier()
            : new JwksTokenVerifier(env.SUPABASE_URL, env.JWT_ISSUER, env.JWT_AUDIENCE);
        return new JwtAuthGuard(reflector, verifier);
      },
      inject: [Reflector, API_ENV],
    },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RateLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AccountStatusGuard },
  ],
  exports: [TOKEN_VERIFIER, JwtAuthGuard, RolesGuard, AccountStatusGuard, RateLimitGuard],
})
export class AuthCoreModule {}
