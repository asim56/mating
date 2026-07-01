import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { Public, RateLimit } from '../../common';
import {
  AddEmailDto,
  LoginEmailDto,
  RecoverConfirmEmailDto,
  RecoverConfirmPhoneDto,
  RecoverDto,
  RegisterEmailDto,
  VerifyEmailDto,
} from './dto/email-auth.dto';
import { OtpRequestDto, OtpRequestResponseDto, OtpVerifyDto } from './dto/otp.dto';
import { IdentityService } from './identity.service';
import { SessionsService } from './sessions.service';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly sessions: SessionsService,
  ) {}

  @Post('otp/request')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Request phone OTP for sign-up or sign-in' })
  @ApiResponse({ status: 200, description: 'OTP dispatched' })
  requestOtp(@Body() dto: OtpRequestDto): Promise<OtpRequestResponseDto> {
    return this.identity.requestOtp(dto);
  }

  @Post('otp/verify')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Verify phone OTP and issue a session' })
  @ApiResponse({ status: 200, description: 'Session issued' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.identity.verifyOtp(dto);
  }

  @Post('register')
  @Public()
  @RateLimit('auth')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Register with email and password' })
  register(@Body() dto: RegisterEmailDto) {
    return this.identity.registerEmail(dto);
  }

  @Post('email/verify')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Verify email ownership' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.identity.verifyEmail(dto);
  }

  @Post('login')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() dto: LoginEmailDto) {
    return this.identity.loginEmail(dto);
  }

  @Post('recover')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Begin account recovery' })
  recover(@Body() dto: RecoverDto) {
    return this.identity.recover(dto);
  }

  @Post('recover/confirm')
  @Public()
  @RateLimit('auth')
  @ApiOperation({ summary: 'Complete account recovery' })
  recoverConfirm(@Body() dto: RecoverConfirmPhoneDto | RecoverConfirmEmailDto) {
    if ('phone' in dto && dto.phone) {
      return this.identity.recoverConfirmPhone(dto as RecoverConfirmPhoneDto);
    }
    return this.identity.recoverConfirmEmail(dto as RecoverConfirmEmailDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current session' })
  logout(@Req() req: { user?: AuthenticatedUser }) {
    return this.sessions.logout(req.user!);
  }
}
