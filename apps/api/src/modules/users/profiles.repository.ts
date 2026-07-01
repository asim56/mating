import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  PK_PHONE_REGEX,
  type SelfSelectableRole,
  US_PHONE_REGEX,
} from '@mating/shared';

import { ApiError, ERROR_CODES } from '../../common';
import { SUPABASE_CLIENT } from '../../infra/supabase/tokens';

export type ProfileRow = {
  account_id: string;
  display_name: string | null;
  region_id: string | null;
  locale: string;
  primary_role: string;
  profile_complete: boolean;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ProfilesRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient) {}

  async findByAccountId(accountId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as ProfileRow | null;
  }

  async completeProfile(input: {
    accountId: string;
    displayName: string;
    regionCode: string;
    locale: string;
    primaryRole: SelfSelectableRole;
    phone?: string | null;
  }): Promise<ProfileRow> {
    const existing = await this.findByAccountId(input.accountId);
    if (existing?.profile_complete) {
      throw new ApiError(ERROR_CODES.CONFLICT, 'Profile already complete.', HttpStatus.CONFLICT);
    }

    const { data: region } = await this.client
      .from('regions')
      .select('id, active, locales')
      .eq('code', input.regionCode)
      .maybeSingle();

    if (!region?.active) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid region.', HttpStatus.BAD_REQUEST);
    }

    const locales = (region.locales as string[]) ?? [];
    if (!locales.includes(input.locale)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid locale for region.', HttpStatus.BAD_REQUEST);
    }

    if (input.phone) {
      this.validatePhone(input.phone, input.regionCode);
    }

    const payload = {
      display_name: input.displayName,
      region_id: region.id,
      locale: input.locale,
      primary_role: input.primaryRole,
      profile_complete: true,
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    };

    const { data, error } = existing
      ? await this.client
          .from('profiles')
          .update(payload)
          .eq('account_id', input.accountId)
          .select()
          .single()
      : await this.client
          .from('profiles')
          .insert({ account_id: input.accountId, ...payload })
          .select()
          .single();

    if (error) throw new Error(error.message);
    return data as ProfileRow;
  }

  async patchProfile(
    accountId: string,
    patch: { displayName?: string; locale?: string; phone?: string | null },
    regionLocales: string[],
    regionCode: string,
  ): Promise<ProfileRow> {
    if (patch.locale && !regionLocales.includes(patch.locale)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid locale for region.', HttpStatus.BAD_REQUEST);
    }
    if (patch.phone) {
      this.validatePhone(patch.phone, regionCode);
    }

    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
        ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ProfileRow;
  }

  private validatePhone(phone: string, regionCode: string): void {
    if (regionCode === 'PK' && !PK_PHONE_REGEX.test(phone)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid PK phone.', HttpStatus.BAD_REQUEST);
    }
    if (regionCode === 'US' && !US_PHONE_REGEX.test(phone)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid US phone.', HttpStatus.BAD_REQUEST);
    }
  }
}
