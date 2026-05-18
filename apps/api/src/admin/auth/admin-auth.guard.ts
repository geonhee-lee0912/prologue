import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 운영자 전용 가드. AdminJwtStrategy 로 검증.
 *
 * 전역 JwtAuthGuard 는 @Public() 으로 우회해야 한다.
 * 즉 admin 컨트롤러는 `@Public()` + `@UseGuards(AdminJwtAuthGuard)` 조합으로 일반 가드를 비활성화하고 admin 가드만 적용.
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {}
