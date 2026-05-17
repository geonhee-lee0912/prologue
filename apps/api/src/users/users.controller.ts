import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';

/**
 * /api/v1/me
 *
 * JWT 토큰에서 추출한 사용자 정보 반환. DB 조회는 하지 않음.
 * (DB 의 public.users row 와 enrich 하는 별도 가드는 후속 단계에서 추가)
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/me')
export class UsersController {
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
}
