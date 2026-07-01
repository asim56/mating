import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { PASSWORD_MIN_LENGTH, SELF_SELECTABLE_ROLES } from '@mating/shared';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RegisterEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: 'password must include at least one letter and one digit' })
  password!: string;

  @ApiPropertyOptional({ enum: SELF_SELECTABLE_ROLES })
  @IsOptional()
  @IsIn([...SELF_SELECTABLE_ROLES])
  role?: (typeof SELF_SELECTABLE_ROLES)[number];
}

export class LoginEmailDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceDescriptor?: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

export class RecoverDto {
  @ApiProperty({ description: 'Phone E.164 or email address' })
  @IsString()
  identifier!: string;
}

export class RecoverConfirmPhoneDto {
  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceDescriptor?: string;
}

export class RecoverConfirmEmailDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: 'password must include at least one letter and one digit' })
  newPassword!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceDescriptor?: string;
}

export class AddEmailDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: 'password must include at least one letter and one digit' })
  password!: string;
}
