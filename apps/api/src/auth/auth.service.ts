import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCode,
  IDENTITY_VERIFICATION_PROVIDER,
  SMS_PROVIDER,
  type IdentityVerificationProvider,
  type IdentityVerificationStartResult,
  type SmsProvider,
} from '@prologue/shared';
import { randomInt, randomUUID } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { CompleteIdentityDto, ConsentItemDto } from './dto/complete-identity.dto';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtIssuerService } from './jwt-issuer.service';
import { OtpStoreService } from './otp-store.service';
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
    @Inject(SMS_PROVIDER)
    private readonly sms: SmsProvider,
    private readonly sessionStore: SessionStoreService,
    private readonly otpStore: OtpStoreService,
    private readonly prisma: PrismaService,
    private readonly jwtIssuer: JwtIssuerService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // 로그인 (FR-A02) — SMS OTP
  // ============================================================

  /**
   * 가입된 휴대폰 번호로 OTP 발송. 미가입자 노출 방지를 위해
   * 응답은 항상 동일 형태 (성공/미가입 구분 안 함).
   */
  async sendLoginOtp(dto: SendOtpDto): Promise<{ sentAt: string }> {
    const pepper = this.requirePepper();
    const phoneHash = hashPhone(dto.phoneNumber, pepper);

    const user = await this.prisma.user.findUnique({ where: { phoneHash } });
    if (user) {
      // 6자리 코드 (010000~999999)
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await this.otpStore.issue(phoneHash, code);
      await this.sms.sendOtp(dto.phoneNumber, code);
    } else {
      // 미가입자 — 응답은 동일하게 보내되 실제 SMS 발송 안 함.
      // (사용자 열거 공격 방지)
      this.logger.warn(`OTP requested for unregistered phone`);
    }

    return { sentAt: new Date().toISOString() };
  }

  async verifyLoginOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const pepper = this.requirePepper();
    const phoneHash = hashPhone(dto.phoneNumber, pepper);

    const result = await this.otpStore.verify(phoneHash, dto.code);
    if (result === 'expired') {
      throw new AppException(ErrorCode.OTP_EXPIRED, '인증 코드가 만료되었습니다.', HttpStatus.UNAUTHORIZED);
    }
    if (result === 'too_many_attempts') {
      throw new AppException(
        ErrorCode.OTP_TOO_MANY_ATTEMPTS,
        '인증 시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result === 'invalid') {
      throw new AppException(ErrorCode.OTP_INVALID, '인증 코드가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { phoneHash } });
    if (!user) {
      // OTP 검증 통과했는데 user 없음 — 이론상 불가능 (sendLoginOtp 가 user 있을 때만 발급)
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        '등록되지 않은 휴대폰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.checkAccountStatus(user.status);

    const accessToken = this.jwtIssuer.issueAccessToken({ sub: user.id });
    const refreshToken = await this.jwtIssuer.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      isNewUser: false,
      identityVerified: true,
      nextStep: this.determineNextStep(user.status),
    };
  }

  private requirePepper(): string {
    const pepper = this.config.get<string>('PHONE_HASH_PEPPER');
    if (!pepper) {
      throw new Error('PHONE_HASH_PEPPER 환경변수가 설정되지 않았습니다.');
    }
    return pepper;
  }

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

      const pepper = this.requirePepper();
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
