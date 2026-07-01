import { HttpStatus, Injectable } from '@nestjs/common';

import {
  PK_PHONE_REGEX,
  type SelfSelectableRole,
  SELF_SELECTABLE_ROLES,
  US_PHONE_REGEX,
} from '@mating/shared';

import { ApiError, ERROR_CODES } from '../../common';
import { SupabaseService } from '../../infra/supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type {
  AddEmailDto,
  LoginEmailDto,
  RecoverConfirmEmailDto,
  RecoverConfirmPhoneDto,
  RecoverDto,
  RegisterEmailDto,
  VerifyEmailDto,
} from './dto/email-auth.dto';
import type { OtpRequestDto, OtpVerifyDto } from './dto/otp.dto';
import { ProfilesRepository, SessionsRepository, UserRolesRepository } from './sessions.repository';

export type AuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  account: { id: string; status: string };
  session: { id: string; createdAt: string };
};

const LOGIN_FAILURE = 'Invalid credentials.';
const RECOVERY_SENT = { status: 'if_account_exists_instructions_sent' as const };
const VERIFICATION_SENT = { status: 'verification_sent' as const };

@Injectable()
export class IdentityService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sessions: SessionsRepository,
    private readonly roles: UserRolesRepository,
    private readonly profiles: ProfilesRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async requestOtp(dto: OtpRequestDto): Promise<{ status: 'sent'; resendAfterSeconds: number }> {
    const { OTP_RESEND_COOLDOWN_SECONDS } = await import('@mating/shared');
    const { error } = await this.supabase.client.auth.signInWithOtp({ phone: dto.phone });
    if (error) {
      throw new ApiError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Unable to send verification code.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'sent', resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }

  async verifyOtp(dto: OtpVerifyDto): Promise<AuthSessionPayload> {
    const role = this.resolveRole(dto.role);
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      phone: dto.phone,
      token: dto.code,
      type: 'sms',
    });
    if (error || !data.session || !data.user) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired verification code.', HttpStatus.UNAUTHORIZED);
    }
    return this.issueSession(data.session, data.user.id, {
      isNew: await this.profiles.ensurePhoneProfile({ accountId: data.user.id, phone: dto.phone, role }),
      role,
      regionCode: 'PK',
      deviceDescriptor: dto.deviceDescriptor,
    });
  }

  async registerEmail(dto: RegisterEmailDto): Promise<{ status: 'verification_sent' }> {
    const role = this.resolveRole(dto.role);
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: { data: { primary_role: role } },
    });

    if (error && !error.message.includes('already registered')) {
      if (error.message.toLowerCase().includes('password')) {
        throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid email or password.', HttpStatus.BAD_REQUEST);
      }
    }

    if (data.user && !error) {
      const isNew = await this.profiles.ensureEmailProfile({
        accountId: data.user.id,
        email: dto.email,
        role,
        regionCode: 'US',
      });
      if (isNew) {
        await this.roles.assignSelfRole(data.user.id, role);
        await this.analytics.capture({
          event: 'user_signed_up',
          accountId: data.user.id,
          properties: { regionCode: 'US', role },
        });
      }
    }

    return VERIFICATION_SENT;
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ status: 'verified' }> {
    const { error } = await this.supabase.client.auth.verifyOtp({
      token_hash: dto.token,
      type: 'email',
    });
    if (error) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired token.', HttpStatus.UNAUTHORIZED);
    }
    return { status: 'verified' };
  }

  async loginEmail(dto: LoginEmailDto): Promise<AuthSessionPayload> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error || !data.session || !data.user) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, LOGIN_FAILURE, HttpStatus.UNAUTHORIZED);
    }
    if (!data.user.email_confirmed_at) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, LOGIN_FAILURE, HttpStatus.UNAUTHORIZED);
    }
    return this.issueSession(data.session, data.user.id, { deviceDescriptor: dto.deviceDescriptor });
  }

  async recover(dto: RecoverDto): Promise<{ status: 'if_account_exists_instructions_sent' }> {
    if (dto.identifier.includes('@')) {
      await this.supabase.client.auth.resetPasswordForEmail(dto.identifier);
    } else {
      await this.supabase.client.auth.signInWithOtp({ phone: dto.identifier });
    }
    return RECOVERY_SENT;
  }

  async recoverConfirmPhone(dto: RecoverConfirmPhoneDto): Promise<AuthSessionPayload> {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      phone: dto.phone,
      token: dto.code,
      type: 'sms',
    });
    if (error || !data.session || !data.user) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired verification code.', HttpStatus.UNAUTHORIZED);
    }
    await this.sessions.revokeAll(data.user.id);
    return this.issueSession(data.session, data.user.id, { deviceDescriptor: dto.deviceDescriptor });
  }

  async recoverConfirmEmail(dto: RecoverConfirmEmailDto): Promise<AuthSessionPayload> {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      token_hash: dto.token,
      type: 'recovery',
    });
    if (error || !data.session || !data.user) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired token.', HttpStatus.UNAUTHORIZED);
    }
    await this.supabase.client.auth.admin.updateUserById(data.user.id, {
      password: dto.newPassword,
    });
    await this.sessions.revokeAll(data.user.id);
    return this.issueSession(data.session, data.user.id, { deviceDescriptor: dto.deviceDescriptor });
  }

  async addEmailToAccount(accountId: string, dto: AddEmailDto): Promise<{ status: 'verification_sent' }> {
    const { data: existing } = await this.supabase.client
      .from('profiles')
      .select('account_id')
      .eq('email', dto.email)
      .neq('account_id', accountId)
      .maybeSingle();

    if (existing) {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        'Email is already linked to another account.',
        HttpStatus.CONFLICT,
      );
    }

    const { error } = await this.supabase.client.auth.admin.updateUserById(accountId, {
      email: dto.email,
      password: dto.password,
      email_confirm: false,
    });
    if (error) {
      throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Unable to add email.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    await this.supabase.client.from('profiles').update({ email: dto.email }).eq('account_id', accountId);
    return VERIFICATION_SENT;
  }

  rejectPkPhoneForUs(phone: string): void {
    if (PK_PHONE_REGEX.test(phone) && !US_PHONE_REGEX.test(phone)) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'PK-only phone numbers are not accepted for US visitors.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async issueSession(
    session: { access_token: string; refresh_token: string; expires_in?: number },
    accountId: string,
    opts: {
      isNew?: boolean;
      role?: SelfSelectableRole;
      regionCode?: string;
      deviceDescriptor?: string;
    } = {},
  ): Promise<AuthSessionPayload> {
    if (opts.isNew && opts.role) {
      await this.roles.assignSelfRole(accountId, opts.role);
      await this.analytics.capture({
        event: 'user_signed_up',
        accountId,
        properties: { regionCode: opts.regionCode ?? 'US', role: opts.role },
      });
    }

    const sessionId = this.extractSessionId(session.access_token) ?? accountId;
    const mirrored = await this.sessions.mirror({
      id: sessionId,
      accountId,
      deviceDescriptor: opts.deviceDescriptor,
    });

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in ?? 3600,
      account: { id: accountId, status: 'active' },
      session: { id: mirrored.id, createdAt: mirrored.created_at },
    };
  }

  private async findAccountIdByPhone(phone: string): Promise<string | null> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('account_id')
      .eq('phone', phone)
      .maybeSingle();
    return data?.account_id ?? null;
  }

  private resolveRole(role?: SelfSelectableRole): SelfSelectableRole {
    if (role && SELF_SELECTABLE_ROLES.includes(role)) {
      return role;
    }
    return 'buyer';
  }

  private extractSessionId(accessToken: string): string | null {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as {
        session_id?: string;
      };
      return payload.session_id ?? null;
    } catch {
      return null;
    }
  }
}
