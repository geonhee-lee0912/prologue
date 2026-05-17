import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IdentityVerificationStartResult } from '@prologue/shared';
import { AuthService, type AuthResponse } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { CompleteIdentityDto } from './dto/complete-identity.dto';
import { LoginKakaoDto } from './dto/login-kakao.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { StartIdentityDto } from './dto/start-identity.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { CurrentUserData } from './types/jwt-payload';

/**
 * @fr FR-A01 회원가입 (본인 인증으로 통합)
 * @fr FR-A03 약관 동의 (가입 트랜잭션에 포함)
 * @fr FR-B01 본인 인증 (가입과 동시 완료)
 */
@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('identity/start')
  @ApiOperation({
    summary: '본인 인증 세션 시작',
    description:
      '본인 인증 흐름을 시작한다. 카카오 OAuth 로 진입한 경우 kakaoAccessToken 을 함께 전달하면 ' +
      '백엔드가 카카오 user 정보를 조회해 세션에 kakaoId 를 보관한다 (가입 완료 시 User.kakaoId 로 저장).',
  })
  async startIdentity(@Body() dto: StartIdentityDto): Promise<IdentityVerificationStartResult> {
    return this.authService.startIdentity(dto);
  }

  @Public()
  @Post('identity/complete')
  @ApiOperation({
    summary: '본인 인증 완료 → 회원가입 또는 로그인 → JWT 발급',
    description:
      'PASS 콜백을 받은 후 (또는 mock 모드의 사용자 입력값으로) 본인 인증을 완료한다. ' +
      '동일 CI 의 기존 사용자가 있으면 로그인, 없으면 신규 가입 (User + UserAuth + UserConsent) 처리. ' +
      '응답으로 accessToken (15분), refreshToken (30일), 다음 단계 (B02_FACE_VERIFICATION / D01_HOME) 를 반환.',
  })
  async completeIdentity(@Body() dto: CompleteIdentityDto): Promise<AuthResponse> {
    return this.authService.completeIdentity(dto);
  }

  // ============================================================
  // FR-A02 로그인 (SMS OTP)
  // ============================================================

  @Public()
  @Post('login/otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인 OTP 발송',
    description:
      '가입된 휴대폰 번호로 6자리 OTP 를 발송한다. 미가입 휴대폰에 대해서도 동일한 응답을 반환하여 ' +
      '사용자 열거 공격을 방지한다. 실제 SMS 는 가입자에게만 보낸다.',
  })
  async sendLoginOtp(@Body() dto: SendOtpDto): Promise<{ sentAt: string }> {
    return this.authService.sendLoginOtp(dto);
  }

  @Public()
  @Post('login/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인 OTP 검증 → JWT 발급',
    description: '발송된 OTP 와 휴대폰 번호를 검증하고 성공 시 access/refresh token 을 반환.',
  })
  async verifyLoginOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponse> {
    return this.authService.verifyLoginOtp(dto);
  }

  // ============================================================
  // FR-A02 로그인 (카카오 OAuth)
  // ============================================================

  @Public()
  @Post('login/kakao')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '카카오 OAuth 로 로그인',
    description:
      '모바일이 카카오 OAuth 로 받은 access_token 을 검증해 (User.kakaoId 로 조회) 로그인 처리. ' +
      '미가입자는 KAKAO_NOT_REGISTERED 401 응답.',
  })
  async loginKakao(@Body() dto: LoginKakaoDto): Promise<AuthResponse> {
    return this.authService.loginKakao(dto);
  }

  // ============================================================
  // Refresh / Logout
  // ============================================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh token 으로 새 access token 발급 (회전 포함)',
    description: '기존 refresh token 은 revoke 되고 새 token 이 발급된다.',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃 — 사용자의 모든 refresh token 무효화',
  })
  async logout(@CurrentUser() user: CurrentUserData): Promise<{ revokedCount: number }> {
    return this.authService.logout(user.userId);
  }
}
