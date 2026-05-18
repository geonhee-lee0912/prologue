import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AdminJwtPayload, CurrentAdminData } from './admin-payload.types';

/**
 * 운영자 전용 JWT 전략.
 *
 * 일반 사용자 JWT 와 시크릿 분리 (`ADMIN_JWT_SECRET`).
 * 일반 사용자 JWT 로는 admin 라우트에 절대 접근 불가.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AdminJwtPayload): Promise<CurrentAdminData> {
    if (!payload?.sub || payload?.kind !== 'admin') {
      throw new UnauthorizedException('잘못된 운영자 토큰입니다.');
    }
    return { adminId: payload.sub, role: payload.role };
  }
}
