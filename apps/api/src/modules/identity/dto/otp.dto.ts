import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PK_PHONE_REGEX, SELF_SELECTABLE_ROLES } from '@mating/shared';

export class OtpRequestDto {
  @ApiProperty({ example: '+923001234567' })
  @Matches(PK_PHONE_REGEX, { message: 'phone must be a valid Pakistan E.164 number (+92...)' })
  phone!: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+923001234567' })
  @Matches(PK_PHONE_REGEX, { message: 'phone must be a valid Pakistan E.164 number (+92...)' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ enum: SELF_SELECTABLE_ROLES })
  @IsOptional()
  @IsIn([...SELF_SELECTABLE_ROLES])
  role?: (typeof SELF_SELECTABLE_ROLES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceDescriptor?: string;
}

export class OtpRequestResponseDto {
  @ApiProperty({ enum: ['sent'], example: 'sent' })
  status!: string;

  @ApiProperty({ example: 60 })
  resendAfterSeconds!: number;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 3600 })
  expiresIn!: number;

  @ApiProperty()
  account!: { id: string; status: string };

  @ApiProperty()
  session!: { id: string; createdAt: string };
}
