import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCode,
  IDENTITY_VERIFICATION_PROVIDER,
  type IdentityVerificationProvider,
  type IdentityVerificationStartResult,
} from '@prologue/shared';
import { randomUUID } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { CompleteIdentityDto, ConsentItemDto } from './dto/complete-identity.dto';
import { JwtIssuerService } from './jwt-issuer.service';
import { hashPhone } from './phone-hash.util';
import { SessionStoreService } from './session-store.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  identityVerified: boolean;
  nextStep: 'B02_FACE_VERIFICATION' | 'D01_HOME';
}

/**
 * FR-A01 회원가입 (본인 인증) + FR-A02 로그인 (CI 기반 자동 분기).
 * FR-B01 본인 인증은 가입 트랜잭션과 동일 시점에 완료된다.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly identity: IdentityVerificationProvider,
    private readonly sessionStore: SessionStoreService,
    private readonly prisma: PrismaService,
    private readonly jwtIssuer: JwtIssuerService,
    private readonly config: ConfigService,
  ) {}

  async startIdentity(): Promise<IdentityVerificationStartResult> {
    const result = await this.identity.startVerification();
    this.sessionStore.start(result.sessionId);
    this.logger.log(`identity session started: ${result.sessionId}`);
    return result;
  }

  async completeIdentity(dto: CompleteIdentityDto): Promise<AuthResponse> {
    if (!this.sessionStore.has(dto.sessionId)) {
      throw new AppException(
        ErrorCode.OTP_INVALID,
        '본인 인증 세션이 만료되었거나 유효하지 않습니다. 다시 시작해 주세요.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.identity.completeVerification(dto.sessionId, dto.callbackToken);

    // 동일 CI 로 가입한 기존 사용자 조회
    const existing = await this.prisma.userAuth.findUnique({
      where: { identityCiHash: result.ciHash },
      include: { user: true },
    });

    let user;
    let isNewUser = false;

    if (existing) {
      // 기존 사용자: 로그인 흐름
      user = existing.user;
      this.checkAccountStatus(user.status);
    } else {
      // 신규 사용자: 가입 흐름
      this.requireConsents(dto.consents);
      this.requireMinimumAge(result.birthYear);

      const pepper = this.config.get<string>('PHONE_HASH_PEPPER');
      if (!pepper) {
        throw new Error('PHONE_HASH_PEPPER 환경변수가 설정되지 않았습니다.');
      }
      const phoneHash = hashPhone(result.phoneNumber, pepper);

      // 휴대폰 중복 가입 방지 (CI 와 phoneHash 둘 다 unique)
      const existingByPhone = await this.prisma.user.findUnique({ where: { phoneHash } });
      if (existingByPhone) {
        throw new AppException(
          ErrorCode.PHONE_ALREADY_REGISTERED,
          '이미 등록된 휴대폰 번호입니다.',
          HttpStatus.CONFLICT,
        );
      }

      const userId = randomUUID();
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: userId,
            phoneHash,
            loginProvider: 'phone',
            gender: result.gender,
            birthYear: result.birthYear,
            // 목표 성별 / 지역은 프로필 단계 (FR-C) 에서 갱신됨. 기본값 설정.
            targetGender: result.gender === 'male' ? 'female' : 'male',
            region1: '미설정',
            status: 'pending',
          },
        });
        await tx.userAuth.create({
          data: {
            userId: newUser.id,
            identityVerified: true,
            identityVerifiedAt: result.verifiedAt,
            identityCiHash: result.ciHash,
            identityProvider: 'mock',
            ageVerified: true,
          },
        });
        if (dto.consents?.length) {
          await tx.userConsent.createMany({
            data: dto.consents.map((c) => ({
              userId: newUser.id,
              consentType: c.type,
              required: c.required,
              agreed: c.agreed,
              version: c.version,
            })),
          });
        }
        return newUser;
      });
      isNewUser = true;
      this.logger.log(`new user signed up: ${user.id}`);
    }

    const accessToken = this.jwtIssuer.issueAccessToken({ sub: user.id });
    const refreshToken = await this.jwtIssuer.issueRefreshToken(user.id);

    this.sessionStore.delete(dto.sessionId);

    return {
      accessToken,
      refreshToken,
      isNewUser,
      identityVerified: true,
      nextStep: isNewUser ? 'B02_FACE_VERIFICATION' : this.determineNextStep(user.status),
    };
  }

  private checkAccountStatus(status: string): void {
    if (status === 'withdrawn') {
      throw new AppException(
        ErrorCode.ACCOUNT_WITHDRAWN,
        '탈퇴한 계정입니다.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (status === 'suspended') {
      throw new AppException(
        ErrorCode.ACCOUNT_SUSPENDED,
        '제재 중인 계정입니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private requireConsents(consents?: ConsentItemDto[]): void {
    const required = (consents ?? []).filter((c) => c.required);
    if (required.length === 0 || required.some((c) => !c.agreed)) {
      throw new AppException(
        ErrorCode.REQUIRED_CONSENT_MISSING,
        '필수 약관에 동의해 주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private requireMinimumAge(birthYear: number): void {
    // 만 19세 이상 — 단순 출생연도 기준
    const cutoffYear = new Date().getFullYear() - 19;
    if (birthYear > cutoffYear) {
      throw new AppException(
        ErrorCode.AGE_NOT_ELIGIBLE,
        '만 19세 이상만 가입할 수 있습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private determineNextStep(status: string): 'B02_FACE_VERIFICATION' | 'D01_HOME' {
    return status === 'pending' ? 'B02_FACE_VERIFICATION' : 'D01_HOME';
  }
}
