import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  MANNER_PLEDGE_COPY,
  POLICY,
  SINGLE_PLEDGE_COPY,
  type OnboardingStep,
} from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { PledgeDto } from './dto/pledge.dto';
import type { RelationshipPreferenceDto } from './dto/relationship-preference.dto';

export interface OnboardingStatusView {
  identityVerified: boolean;
  faceMatchStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  ageVerified: boolean;
  relationshipSurveyCompleted: boolean;
  mannerPledgeAgreed: boolean;
  singlePledgeAgreed: boolean;
  hasMainPhoto: boolean;
  hasProfileIntro: boolean;
  nextStep: OnboardingStep;
}

/**
 * @fr FR-B03 나이 확인 (자동 — 본인 인증 시점 ageVerified=true)
 * @fr FR-B04 관계 목적 설문
 * @fr FR-B05 매너 서약
 * @fr FR-B06 싱글 상태 서약
 *
 * 패턴 2 (NestJS 경유 — 다단계 검증·다중 테이블 갱신).
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<OnboardingStatusView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
        profile: true,
        relationshipPreference: true,
        photos: { where: { isMain: true, deletedAt: null }, take: 1 },
      },
    });

    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const view: Omit<OnboardingStatusView, 'nextStep'> = {
      identityVerified: user.auth?.identityVerified ?? false,
      faceMatchStatus: user.auth?.faceMatchStatus ?? 'not_submitted',
      ageVerified: user.auth?.ageVerified ?? false,
      relationshipSurveyCompleted: user.relationshipPreference !== null,
      mannerPledgeAgreed: user.auth?.mannerPledgeAgreed ?? false,
      singlePledgeAgreed: user.auth?.singlePledgeAgreed ?? false,
      hasMainPhoto: user.photos.length > 0,
      hasProfileIntro:
        (user.profile?.intro?.length ?? 0) >= POLICY.profile.minIntroLength,
    };

    return { ...view, nextStep: this.computeNextStep(view) };
  }

  /** 온보딩 단계 결정 — 화면 순서: 본인→얼굴→나이확인→관계설문→매너→싱글→프로필→완료 */
  private computeNextStep(s: Omit<OnboardingStatusView, 'nextStep'>): OnboardingStep {
    if (!s.identityVerified) return 'identity_verification';
    if (!s.hasMainPhoto || s.faceMatchStatus !== 'verified') {
      // 얼굴 인증은 대표 사진 필요 — 둘 다 합쳐서 face_verification 단계로
      return 'face_verification';
    }
    if (!s.ageVerified) return 'age_check';
    if (!s.relationshipSurveyCompleted) return 'relationship_survey';
    if (!s.mannerPledgeAgreed) return 'manner_pledge';
    if (!s.singlePledgeAgreed) return 'single_pledge';
    if (!s.hasProfileIntro) return 'profile_intro';
    return 'completed';
  }

  async saveRelationshipPreference(
    userId: string,
    dto: RelationshipPreferenceDto,
  ): Promise<{ nextStep: OnboardingStep }> {
    const { intent, pace, contactFrequency, marriageOpenness, extra } = dto;
    const mergedExtra: Prisma.InputJsonValue = {
      ...(extra ?? {}),
      ...(marriageOpenness ? { marriageOpenness } : {}),
    };
    const extraInput =
      Object.keys(mergedExtra as Record<string, unknown>).length > 0 ? mergedExtra : Prisma.DbNull;

    await this.prisma.relationshipPreference.upsert({
      where: { userId },
      create: { userId, intent, pace, contactFrequency, extra: extraInput },
      update: { intent, pace, contactFrequency, extra: extraInput },
    });

    this.logger.log(`relationship preference saved ${userId}`);
    const next = await this.getStatus(userId);
    return { nextStep: next.nextStep };
  }

  async agreeMannerPledge(
    userId: string,
    dto: PledgeDto,
  ): Promise<{ nextStep: OnboardingStep }> {
    this.assertAgreed(dto);
    this.assertVersion(dto.version, MANNER_PLEDGE_COPY.version);

    await this.prisma.userAuth.update({
      where: { userId },
      data: {
        mannerPledgeAgreed: true,
        mannerPledgeAgreedAt: new Date(),
      },
    });

    this.logger.log(`manner pledge agreed ${userId}`);
    const next = await this.getStatus(userId);
    return { nextStep: next.nextStep };
  }

  async agreeSinglePledge(
    userId: string,
    dto: PledgeDto,
  ): Promise<{ nextStep: OnboardingStep }> {
    this.assertAgreed(dto);
    this.assertVersion(dto.version, SINGLE_PLEDGE_COPY.version);

    await this.prisma.userAuth.update({
      where: { userId },
      data: {
        singlePledgeAgreed: true,
        singlePledgeAgreedAt: new Date(),
      },
    });

    this.logger.log(`single pledge agreed ${userId}`);
    const next = await this.getStatus(userId);
    return { nextStep: next.nextStep };
  }

  private assertAgreed(dto: PledgeDto): void {
    if (!dto.agreed) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '서약에 동의해야 진행할 수 있어요.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertVersion(provided: string | undefined, current: string): void {
    if (provided !== undefined && provided !== current) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '서약 문구가 갱신되었어요. 다시 확인해주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
