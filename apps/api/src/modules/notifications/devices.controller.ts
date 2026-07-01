import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import type { AuthenticatedUser } from '../../common';
import { DevicesService } from './devices.service';

class RegisterDeviceDto {
  @IsString()
  pushToken!: string;

  @IsIn(['ios', 'android', 'web'])
  platform!: string;
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

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a push notification device' })
  register(@Req() req: { user?: AuthenticatedUser }, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(req.user!.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a device token' })
  remove(@Req() req: { user?: AuthenticatedUser }, @Param('id') id: string) {
    return this.devices.remove(req.user!.id, id);
  }
}
