import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@prologue/shared';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

const ACCESS_TOKEN_TTL = '8h'; // 운영자 세션은 하루 미만
const BCRYPT_ROUNDS = 12;

export interface AdminLoginResult {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    role: 'owner' | 'manager' | 'reviewer';
  };
}

/**
 * 운영자 로그인 / 비밀번호 해시 유틸.
 *
 * @fr FR-K01 운영자 로그인 (08_화면목록_IA K01)
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<AdminLoginResult> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (admin.status !== 'active') {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        '비활성 운영자 계정입니다. 관리자에게 문의하세요.',
        HttpStatus.FORBIDDEN,
      );
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const secret = this.config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    const accessToken = this.jwt.sign(
      { sub: admin.id, role: admin.role, kind: 'admin', iss: 'prologue-admin' },
      { secret, algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL },
    );

    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'admin_login',
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    this.logger.log(`admin login ${admin.id} (${admin.role})`);

    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  }

  async getById(adminId: string): Promise<AdminLoginResult['admin'] | null> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin || admin.status !== 'active') return null;
    return { id: admin.id, email: admin.email, role: admin.role };
  }

  /** 새 운영자 비번 해시 (seed 스크립트 / 운영자 추가용) */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }
}
