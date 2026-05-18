import { Controller, Delete, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { UsersService } from './users.service';

/**
 * /api/v1/me — 마이페이지 영역.
 *
 * @fr FR-J01 마이페이지 (summary)
 * @fr FR-J03 인증 상태 관리 (verifications)
 * @fr FR-J05 계정 탈퇴 (withdraw)
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '내 토큰 정보 확인 (JWT 가드 동작 검증용)' })
  me(@CurrentUser() user: CurrentUserData) {
    return {
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'FR-J01 마이페이지 요약 (프로필 + 인증 + 멤버십)',
    description:
      '내 프로필 요약, 인증 상태, 멤버십, 대표 사진 signed url 까지 한 번에. 휴대폰/이메일/카카오ID 등 식별자는 제외.',
  })
  getMeSummary(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getMeSummary(user.userId);
  }

  @Get('verifications')
  @ApiOperation({
    summary: 'FR-J03 인증 상태 관리 — 모든 인증·서약 상태',
    description:
      '본인/얼굴/나이/매너/싱글/직업 인증 상태와 완료 시각. 운영자 검수 사유는 포함하지 않음.',
  })
  getMyVerifications(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getMyVerifications(user.userId);
  }

  @Delete('account')
  @ApiOperation({
    summary: 'FR-J05 계정 탈퇴',
    description:
      'User.status=withdrawn 으로 변경, refresh token 전부 revoke. ' +
      '추천/매칭/대화 노출 중단. 법적 보관이 필요한 데이터(신고 등)는 보존 정책에 따라 유지.',
  })
  withdraw(@CurrentUser() user: CurrentUserData) {
    return this.usersService.withdraw(user.userId);
  }
}
