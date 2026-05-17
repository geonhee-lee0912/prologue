import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IdentityVerificationStartResult } from '@prologue/shared';
import { AuthService, type AuthResponse } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CompleteIdentityDto } from './dto/complete-identity.dto';

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
      '본인 인증 흐름을 시작한다. 응답의 sessionId 를 보관하고, 사용자가 인증을 완료하면 ' +
      '`/auth/identity/complete` 호출 시 callbackToken 과 함께 전달한다.',
  })
  async startIdentity(): Promise<IdentityVerificationStartResult> {
    return this.authService.startIdentity();
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
}
