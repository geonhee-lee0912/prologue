import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentAdminData } from '../auth/admin-payload.types';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminData => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentAdminData }>();
    return request.user;
  },
);
