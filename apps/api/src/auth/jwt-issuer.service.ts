import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

interface AccessTokenInput {
  sub: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class JwtIssuerService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Supabase 호환 HS256 access token 발급.
   * SupabaseJwtStrategy 가 동일 secret 으로 검증.
   * 휴대폰/이메일은 페이로드에 절대 포함하지 않는다 (PII).
   */
  issueAccessToken(input: AccessTokenInput): string {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    return this.jwt.sign(
      {
        sub: input.sub,
        role: 'authenticated',
        aud: 'authenticated',
        iss: 'prologue',
      },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );
  }

  /**
   * Refresh token 발행: 평문은 클라이언트에만 전달, 서버는 SHA-256 만 저장.
   * 30일 TTL. 회전 시 replacedById 로 추적.
   */
  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return raw;
  }
}
