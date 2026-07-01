import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';

import { SupabaseService } from '../../infra/supabase/supabase.service';
import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';
import type { AuthenticatedUser } from './roles.decorator';

/**
 * Blocks suspended accounts from protected routes. Runs after {@link JwtAuthGuard}.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return true;
    }

    const { data, error } = await this.supabase.client
      .from('account_status')
      .select('status')
      .eq('account_id', user.id)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Unable to verify account status.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (data?.status === 'suspended') {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        'Account is suspended.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
