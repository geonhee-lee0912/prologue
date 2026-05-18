import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

const PHOTOS_BUCKET = 'photos';
const SIGNED_URL_TTL_SEC = 60 * 60; // 1시간

export interface MeSummaryView {
  user: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    membershipType: string;
    status: string;
  };
  profile: {
    intro: string | null;
    jobCategory: string | null;
    lifestyleTags: string[];
    completionScore: number;
    mainPhotoUrl: string | null;
  } | null;
  verification: {
    identityVerified: boolean;
    faceMatchStatus: string;
    ageVerified: boolean;
    mannerPledgeAgreed: boolean;
    singlePledgeAgreed: boolean;
    employmentVerificationStatus: string;
  };
  onboardingCompleted: boolean;
}

export interface MyVerificationsView {
  identityVerified: boolean;
  identityVerifiedAt: Date | null;
  faceMatchStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  faceVerifiedAt: Date | null;
  ageVerified: boolean;
  mannerPledgeAgreed: boolean;
  mannerPledgeAgreedAt: Date | null;
  singlePledgeAgreed: boolean;
  singlePledgeAgreedAt: Date | null;
  employmentVerificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  employmentVerifiedAt: Date | null;
}

/**
 * @fr FR-J01 마이페이지 요약
 * @fr FR-J03 인증 상태 관리
 * @fr FR-J05 계정 탈퇴
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async getMeSummary(userId: string): Promise<MeSummaryView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
        profile: true,
        photos: { where: { isMain: true, deletedAt: null }, take: 1 },
      },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const mainPhotoUrl =
      user.photos[0] !== undefined ? await this.signPhotoUrl(user.photos[0].storageKey) : null;

    return {
      user: {
        id: user.id,
        gender: user.gender,
        birthYear: user.birthYear,
        region1: user.region1,
        region2: user.region2,
        membershipType: user.membershipType,
        status: user.status,
      },
      profile: user.profile
        ? {
            intro: user.profile.intro,
            jobCategory: user.profile.jobCategory,
            lifestyleTags: user.profile.lifestyleTags,
            completionScore: user.profile.completionScore,
            mainPhotoUrl,
          }
        : null,
      verification: {
        identityVerified: user.auth?.identityVerified ?? false,
        faceMatchStatus: user.auth?.faceMatchStatus ?? 'not_submitted',
        ageVerified: user.auth?.ageVerified ?? false,
        mannerPledgeAgreed: user.auth?.mannerPledgeAgreed ?? false,
        singlePledgeAgreed: user.auth?.singlePledgeAgreed ?? false,
        employmentVerificationStatus: user.auth?.employmentVerificationStatus ?? 'not_submitted',
      },
      onboardingCompleted: user.status === 'active',
    };
  }

  async getMyVerifications(userId: string): Promise<MyVerificationsView> {
    const auth = await this.prisma.userAuth.findUnique({ where: { userId } });
    return {
      identityVerified: auth?.identityVerified ?? false,
      identityVerifiedAt: auth?.identityVerifiedAt ?? null,
      faceMatchStatus: auth?.faceMatchStatus ?? 'not_submitted',
      faceVerifiedAt: auth?.faceVerifiedAt ?? null,
      ageVerified: auth?.ageVerified ?? false,
      mannerPledgeAgreed: auth?.mannerPledgeAgreed ?? false,
      mannerPledgeAgreedAt: auth?.mannerPledgeAgreedAt ?? null,
      singlePledgeAgreed: auth?.singlePledgeAgreed ?? false,
      singlePledgeAgreedAt: auth?.singlePledgeAgreedAt ?? null,
      employmentVerificationStatus: auth?.employmentVerificationStatus ?? 'not_submitted',
      employmentVerifiedAt: auth?.employmentVerifiedAt ?? null,
    };
  }

  /**
   * @fr FR-J05 계정 탈퇴
   *
   * - User.status='withdrawn', withdrawnAt=now()
   * - 모든 refresh token revoke
   * - 추천/매칭/대화 노출 중단은 status='withdrawn' 으로 후속 쿼리에서 제외 (별도 작업)
   * - 법적 보관이 필요한 데이터 (신고 등) 는 보존 정책에 따라 유지
   */
  async withdraw(userId: string): Promise<{ withdrawn: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (user.status === 'withdrawn') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '이미 탈퇴 처리된 계정이에요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'withdrawn', withdrawnAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`user withdrawn ${userId}`);
    return { withdrawn: true };
  }

  private async signPhotoUrl(storageKey: string): Promise<string | null> {
    const { data, error } = await this.supabase.admin.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(storageKey, SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) {
      this.logger.warn(`photo signed url 발급 실패 (${storageKey}): ${error?.message ?? 'no data'}`);
      return null;
    }
    return data.signedUrl;
  }
}
