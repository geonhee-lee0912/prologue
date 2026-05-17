import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUserData } from '../types/jwt-payload';

/**
 * 인증된 사용자 정보를 라우터 핸들러 파라미터로 주입.
 *
 * @example
 *   @Get('me')
 *   me(@CurrentUser() user: CurrentUserData) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserData }>();
    return request.user;
  },
);
