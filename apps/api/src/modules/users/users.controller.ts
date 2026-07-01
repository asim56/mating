import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import {
  PK_PHONE_REGEX,
  SELF_SELECTABLE_ROLES,
  type SelfSelectableRole,
} from '@mating/shared';

import type { AuthenticatedUser } from '../../common';
import { UsersService } from './users.service';

class CompleteProfileDto {
  @IsString()
  displayName!: string;

  @IsIn(['PK', 'US'])
  regionCode!: string;

  @IsIn(['en', 'ur'])
  locale!: string;

  @IsIn([...SELF_SELECTABLE_ROLES])
  primaryRole!: SelfSelectableRole;

  @IsOptional()
  @Matches(PK_PHONE_REGEX, { message: 'invalid phone' })
  phone?: string;
}

class PatchMeDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsIn(['en', 'ur'])
  locale?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;
}

class PreferenceItemDto {
  @IsString()
  channel!: string;

  @IsString()
  category!: string;

  @IsBoolean()
  enabled!: boolean;
}

class PatchPreferencesDto {
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}

class ConsentDto {
  @IsString()
  consentType!: string;

  @IsString()
  version!: string;

  @IsBoolean()
  granted!: boolean;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current account profile' })
  me(@Req() req: { user?: AuthenticatedUser }) {
    return this.users.getMe(req.user!.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  patchMe(@Req() req: { user?: AuthenticatedUser }, @Body() dto: PatchMeDto) {
    return this.users.patchMe(req.user!.id, dto);
  }

  @Post('auth/profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete marketplace profile after sign-up' })
  completeProfile(@Req() req: { user?: AuthenticatedUser }, @Body() dto: CompleteProfileDto) {
    return this.users.completeProfile(req.user!.id, dto);
  }

  @Get('me/notification-preferences')
  @ApiOperation({ summary: 'List notification preferences' })
  getPrefs(@Req() req: { user?: AuthenticatedUser }) {
    return this.users.getNotificationPreferences(req.user!.id);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  patchPrefs(@Req() req: { user?: AuthenticatedUser }, @Body() dto: PatchPreferencesDto) {
    return this.users.patchNotificationPreferences(req.user!.id, dto.preferences);
  }

  @Post('me/consents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record marketing or other consent' })
  consent(@Req() req: { user?: AuthenticatedUser }, @Body() dto: ConsentDto) {
    return this.users.recordConsent(req.user!.id, dto);
  }
}
