import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type SelfSelectableRole,
  SELF_SELECTABLE_ROLES,
} from '@mating/shared';

import { ApiError, ERROR_CODES } from '../../common';
import { SUPABASE_CLIENT } from '../../infra/supabase/tokens';
import type { AuditEmitter } from '../regions/events/region-updated.event';
import { ConsentsRepository } from './consents.repository';
import { ProfilesRepository } from './profiles.repository';
import type { ProfileRow } from './profiles.repository';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import type { PreferenceRow } from './notification-preferences.repository';

const AUDIT_EMITTER = 'AUDIT_EMITTER';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    @Inject(ProfilesRepository) private readonly profiles: ProfilesRepository,
    @Inject(NotificationPreferencesRepository) private readonly prefs: NotificationPreferencesRepository,
    @Inject(ConsentsRepository) private readonly consents: ConsentsRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: AuditEmitter,
  ) {}

  async getMe(accountId: string) {
    const profile = await this.profiles.findByAccountId(accountId);
    if (!profile) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Profile not found.', HttpStatus.NOT_FOUND);
    }
    return this.toMeView(accountId, profile);
  }

  async completeProfile(
    accountId: string,
    input: {
      displayName: string;
      regionCode: string;
      locale: string;
      primaryRole: SelfSelectableRole;
      phone?: string;
    },
  ) {
    if (!SELF_SELECTABLE_ROLES.includes(input.primaryRole)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid role.', HttpStatus.BAD_REQUEST);
    }
    const profile = await this.profiles.completeProfile({
      accountId,
      displayName: input.displayName,
      regionCode: input.regionCode,
      locale: input.locale,
      primaryRole: input.primaryRole,
      phone: input.phone,
    });
    await this.rolesAssignIfMissing(accountId, input.primaryRole);
    return this.toMeView(accountId, profile, true);
  }

  async patchMe(
    accountId: string,
    patch: { displayName?: string; locale?: string; phone?: string | null },
  ) {
    const current = await this.profiles.findByAccountId(accountId);
    if (!current?.profile_complete) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Profile not found.', HttpStatus.NOT_FOUND);
    }
    const region = await this.getRegionForProfile(current);
    const updated = await this.profiles.patchProfile(
      accountId,
      patch,
      region.locales,
      region.code,
    );
    if (patch.displayName) {
      await this.audit.emit({
        action: 'profile.updated',
        actorId: accountId,
        subjectType: 'profile',
        subjectId: accountId,
        metadata: { changedFields: ['displayName'] },
      });
    }
    return this.toMeView(accountId, updated);
  }

  async getNotificationPreferences(accountId: string) {
    const rows = await this.prefs.list(accountId);
    const marketingOptIn = await this.consents.latestMarketingOptIn(accountId);
    return {
      preferences: this.withDefaults(rows),
      marketingOptIn,
    };
  }

  async patchNotificationPreferences(
    accountId: string,
    preferences: { channel: string; category: string; enabled: boolean }[],
  ) {
    const { isOptionalCategory } = await import('../notifications/notification.policy');
    for (const pref of preferences) {
      if (!pref.enabled && !isOptionalCategory(pref.category)) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_FAILED,
          'Cannot disable required notification category.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const rows = await this.prefs.upsert(accountId, preferences);
    const marketingOptIn = await this.consents.latestMarketingOptIn(accountId);
    return { preferences: this.withDefaults(rows), marketingOptIn };
  }

  async recordConsent(
    accountId: string,
    input: { consentType: string; version: string; granted: boolean },
  ) {
    const row = await this.consents.record({ accountId, ...input });
    await this.audit.emit({
      action: input.granted ? 'consent.granted' : 'consent.withdrawn',
      actorId: accountId,
      subjectType: 'consent',
      subjectId: row.id,
      metadata: { consentType: input.consentType, version: input.version },
    });
    return {
      id: row.id,
      consentType: row.consent_type,
      version: row.version,
      granted: row.granted,
      createdAt: row.created_at,
    };
  }

  private async rolesAssignIfMissing(accountId: string, role: SelfSelectableRole) {
    const { data } = await this.client
      .from('user_roles')
      .select('role')
      .eq('account_id', accountId)
      .eq('role', role)
      .maybeSingle();
    if (!data) {
      await this.client.from('user_roles').insert({
        account_id: accountId,
        role,
        granted_by: null,
      });
    }
  }

  private async getRegionForProfile(profile: ProfileRow) {
    const { data } = await this.client
      .from('regions')
      .select('code, name, currency_code, default_locale, locales, config')
      .eq('id', profile.region_id)
      .maybeSingle();
    return {
      code: (data?.code as string) ?? 'PK',
      name: (data?.name as string) ?? '',
      currency_code: (data?.currency_code as string) ?? 'PKR',
      default_locale: (data?.default_locale as string) ?? 'en',
      locales: (data?.locales as string[]) ?? ['en'],
      config: (data?.config as { paymentMethods?: string[] }) ?? {},
    };
  }

  private async toMeView(accountId: string, profile: ProfileRow, created = false) {
    const region = await this.getRegionForProfile(profile);
    const { data: statusRow } = await this.client
      .from('account_status')
      .select('status')
      .eq('account_id', accountId)
      .maybeSingle();
    const { data: roleRows } = await this.client
      .from('user_roles')
      .select('role')
      .eq('account_id', accountId);
    const roles = (roleRows ?? []).map((r) => r.role as string);

    const base = {
      id: accountId,
      status: (statusRow?.status as string) ?? 'active',
      displayName: profile.display_name,
      region: {
        code: region.code,
        name: region.name,
        currencyCode: region.currency_code,
        defaultLocale: region.default_locale,
        locales: region.locales,
        paymentMethods: region.config.paymentMethods ?? [],
      },
      locale: profile.locale,
      primaryRole: profile.primary_role,
      roles,
      permissions: ['profile:read', 'profile:write'],
      profileComplete: profile.profile_complete,
      phone: profile.phone,
      email: profile.email,
      emailVerified: Boolean(profile.email),
      phoneVerified: Boolean(profile.phone),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    return created ? { ...base, status: base.status } : base;
  }

  private withDefaults(rows: PreferenceRow[]) {
    const catalog = [
      { channel: 'email', category: 'transactional', optional: false },
      { channel: 'email', category: 'account_security', optional: false },
      { channel: 'email', category: 'breeding_updates', optional: true },
      { channel: 'email', category: 'marketing', optional: true },
      { channel: 'sms', category: 'transactional', optional: false },
      { channel: 'push', category: 'breeding_updates', optional: true },
    ];
    return catalog.map((item) => {
      const match = rows.find((r) => r.channel === item.channel && r.category === item.category);
      return {
        channel: item.channel,
        category: item.category,
        enabled: match?.enabled ?? true,
        optional: item.optional,
      };
    });
  }
}

