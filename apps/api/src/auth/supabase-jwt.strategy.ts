import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { CurrentUserData, SupabaseJwtPayload } from './types/jwt-payload';

/**
 * Supabase 가 HS256 으로 서명한 JWT 를 검증한다.
 * - Authorization: Bearer <token>
 * - secret: SUPABASE_JWT_SECRET (Settings → API → JWT Secret)
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  // validate() 의 반환값이 request.user 가 됨
  async validate(payload: SupabaseJwtPayload): Promise<CurrentUserData> {
    if (!payload?.sub) {
      throw new UnauthorizedException('잘못된 토큰입니다.');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
    };
  }
}
