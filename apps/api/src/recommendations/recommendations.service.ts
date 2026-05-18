import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Recommendation, RecommendationReason } from '@prisma/client';
import { ErrorCode, POLICY } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { generateReason } from './reason-generator';
import { calculateScore, type UserWithDetails } from './score-calculator';

const RECENT_SKIP_WINDOW_MS =
  POLICY.recommendation.recentSkipExclusionDays * 24 * 60 * 60 * 1000;

export interface RecommendationCardView {
  id: string;
  recommendationDate: string;
  rank: number;
  status: string;
  shownAt: Date | null;
  target: {
    userId: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    profile: {
      jobCategory: string | null;
      intro: string | null;
      lifestyleTags: string[];
    } | null;
    mainPhotoUrl: string | null;
    badges: {
      identityVerified: boolean;
      faceMatchVerified: boolean;
      employmentVerified: boolean;
    };
  };
  reason: {
    summary: string;
    matchedPoints: string[];
    differencePoints: string[];
    conversationTopics: string[];
    curatorMemo: string;
  };
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * 오늘의 추천 목록 (Asia/Seoul 기준).
   * - 기존 추천이 dailyLimit 미만이면 즉시 부족분 생성 (온디맨드).
   * - 점수 숫자는 응답에 포함하지 않음 (CLAUDE.md 10.2).
   */
  async listMyRecommendations(userId: string): Promise<RecommendationCardView[]> {
    const today = this.todayKST();
    const limit = POLICY.recommendation.dailyLimit.free;

    // 1. 오늘 기존 추천 조회
    let existing = await this.prisma.recommendation.findMany({
      where: { userId, recommendationDate: today },
      include: { reason: true },
      orderBy: { rank: 'asc' },
    });

    // 2. 부족하면 온디맨드 생성
    if (existing.length < limit) {
      const need = limit - existing.length;
      const created = await this.generate(userId, today, need, existing.length);
      existing = [...existing, ...created];
    }

    // 3. target 사용자 정보 + 메인 사진 URL 조회
    const targetIds = existing.map((r) => r.targetUserId);
    const targets = await this.prisma.user.findMany({
      where: { id: { in: targetIds } },
      include: { auth: true, profile: true },
    });
    const mainPhotos = await this.prisma.photo.findMany({
      where: { userId: { in: targetIds }, isMain: true, deletedAt: null },
    });
    const mainPhotoMap = new Map<string, string>();
    for (const p of mainPhotos) {
      const url = await this.signPhotoUrl(p.storageKey);
      if (url) mainPhotoMap.set(p.userId, url);
    }
    const targetMap = new Map(targets.map((t) => [t.id, t]));

    return existing.map((rec) =>
      this.toCardView(rec, targetMap.get(rec.targetUserId), mainPhotoMap.get(rec.targetUserId) ?? null),
    );
  }

  async getRecommendation(userId: string, recId: string): Promise<RecommendationCardView> {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recId },
      include: { reason: true },
    });
    if (!rec || rec.userId !== userId) {
      throw new AppException(
        ErrorCode.RECOMMENDATION_NOT_FOUND,
        '추천을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: rec.targetUserId },
      include: { auth: true, profile: true },
    });
    const mainPhoto = await this.prisma.photo.findFirst({
      where: { userId: rec.targetUserId, isMain: true, deletedAt: null },
    });
    const mainPhotoUrl = mainPhoto ? await this.signPhotoUrl(mainPhoto.storageKey) : null;
    return this.toCardView(rec, target ?? undefined, mainPhotoUrl);
  }

  private async signPhotoUrl(storageKey: string): Promise<string | null> {
    const { data } = await this.supabase.admin.storage
      .from('photos')
      .createSignedUrl(storageKey, 60 * 60);
    return data?.signedUrl ?? null;
  }

  async markShown(userId: string, recId: string): Promise<{ status: string }> {
    const rec = await this.prisma.recommendation.findUnique({ where: { id: recId } });
    if (!rec || rec.userId !== userId) {
      throw new AppException(
        ErrorCode.RECOMMENDATION_NOT_FOUND,
        '추천을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (rec.status === 'created') {
      const updated = await this.prisma.recommendation.update({
        where: { id: recId },
        data: { status: 'shown', shownAt: new Date() },
      });
      return { status: updated.status };
    }
    return { status: rec.status };
  }

  // ============================================================
  // 후보 생성 + 점수 계산
  // ============================================================

  private async generate(
    userId: string,
    today: Date,
    count: number,
    rankOffset: number,
  ): Promise<(Recommendation & { reason: RecommendationReason | null })[]> {
    const me = await this.loadUserDetails(userId);
    if (!me) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (!this.isEligibleForRecommendation(me)) {
      // 자신이 인증/서약/설문 미완료면 추천 받을 자격 없음
      return [];
    }

    const candidates = await this.findCandidates(me, today);
    if (candidates.length === 0) {
      this.logger.log(`no candidates for user ${userId}`);
      return [];
    }

    // 점수 계산 + 정렬 (내림차순)
    const scored = candidates
      .map((c) => ({ user: c, score: calculateScore(me, c) }))
      .sort((a, b) => b.score.total - a.score.total);

    const selected = scored.slice(0, count);
    const created: (Recommendation & { reason: RecommendationReason | null })[] = [];

    for (let i = 0; i < selected.length; i++) {
      const { user: target, score } = selected[i];
      const reasonData = generateReason(me, target);

      const rec = await this.prisma.recommendation.create({
        data: {
          userId,
          targetUserId: target.user.id,
          recommendationDate: today,
          rank: rankOffset + i + 1,
          totalScore: score.total,
          trustScore: score.trust,
          relationshipScore: score.relationship,
          lifestyleScore: score.lifestyle,
          conversationScore: score.conversation,
          distanceScore: score.distance,
          profileQualityScore: score.profileQuality,
          status: 'created',
          reason: {
            create: {
              summaryText: reasonData.summaryText,
              matchedPoints: reasonData.matchedPoints,
              differencePoints: reasonData.differencePoints,
              conversationTopics: reasonData.conversationTopics,
              curatorMemo: reasonData.curatorMemo,
              generatedBy: 'rule',
            },
          },
        },
        include: { reason: true },
      });
      created.push(rec);
    }

    this.logger.log(`generated ${created.length} recommendations for user ${userId}`);
    return created;
  }

  private async findCandidates(
    me: UserWithDetails,
    today: Date,
  ): Promise<UserWithDetails[]> {
    const recentSkipCutoff = new Date(Date.now() - RECENT_SKIP_WINDOW_MS);

    const rawCandidates = await this.prisma.user.findMany({
      where: {
        id: { not: me.user.id },
        // 자기와 반대 성별 (단순 매칭, 양방향 호환 검증 별도)
        gender: me.user.targetGender,
        // 추천 자격: 본인+얼굴 인증, 매너·싱글 서약, 관계 목적 설문 (FR-B05/B06/B04)
        auth: {
          identityVerified: true,
          faceMatchStatus: 'verified',
          mannerPledgeAgreed: true,
          singlePledgeAgreed: true,
        },
        relationshipPreference: { isNot: null },
        // 차단 관계 제외
        AND: [
          { blocksMade: { none: { blockedId: me.user.id } } },
          { blocksReceived: { none: { blockerId: me.user.id } } },
        ],
        // 이미 매칭 (양방향)
        matchesAsUserA: { none: { userBId: me.user.id } },
        matchesAsUserB: { none: { userAId: me.user.id } },
        // 최근 30일 내 내가 스킵한 사람 제외
        actionsByUser: {
          none: {
            targetUserId: me.user.id,
            actionType: 'skip',
            createdAt: { gte: recentSkipCutoff },
          },
        },
        actionsTowardUser: {
          none: {
            userId: me.user.id,
            actionType: 'skip',
            createdAt: { gte: recentSkipCutoff },
          },
        },
        // 오늘 이미 추천된 사람 제외
        recommendationsAsTarget: {
          none: {
            userId: me.user.id,
            recommendationDate: today,
          },
        },
      },
      include: {
        auth: true,
        profile: true,
        profileAnswers: true,
        relationshipPreference: true,
      },
    });

    return rawCandidates.map((c) => ({
      user: c,
      auth: c.auth,
      profile: c.profile,
      profileAnswers: c.profileAnswers,
      relationshipPreference: c.relationshipPreference,
    }));
  }

  private async loadUserDetails(userId: string): Promise<UserWithDetails | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
        profile: true,
        profileAnswers: true,
        relationshipPreference: true,
      },
    });
    if (!user) return null;
    return {
      user,
      auth: user.auth,
      profile: user.profile,
      profileAnswers: user.profileAnswers,
      relationshipPreference: user.relationshipPreference,
    };
  }

  private isEligibleForRecommendation(me: UserWithDetails): boolean {
    if (!me.auth?.identityVerified) return false;
    if (me.auth.faceMatchStatus !== 'verified') return false;
    if (!me.auth.mannerPledgeAgreed) return false;
    if (!me.auth.singlePledgeAgreed) return false;
    if (!me.relationshipPreference) return false;
    return true;
  }

  // ============================================================
  // 응답 직렬화 — 점수 컬럼 제외, target 의 PII 도 제외
  // ============================================================

  private toCardView(
    rec: Recommendation & { reason: RecommendationReason | null },
    target?: { id: string; gender: string; birthYear: number; region1: string; region2: string | null } & {
      auth?: {
        identityVerified: boolean;
        faceMatchStatus: string;
        employmentVerificationStatus: string;
      } | null;
      profile?: {
        jobCategory: string | null;
        intro: string | null;
        lifestyleTags: string[];
      } | null;
    },
    mainPhotoUrl: string | null = null,
  ): RecommendationCardView {
    return {
      id: rec.id,
      recommendationDate: rec.recommendationDate.toISOString().split('T')[0],
      rank: rec.rank,
      status: rec.status,
      shownAt: rec.shownAt,
      target: {
        userId: target?.id ?? rec.targetUserId,
        gender: target?.gender ?? '',
        birthYear: target?.birthYear ?? 0,
        region1: target?.region1 ?? '',
        region2: target?.region2 ?? null,
        profile: target?.profile
          ? {
              jobCategory: target.profile.jobCategory,
              intro: target.profile.intro,
              lifestyleTags: target.profile.lifestyleTags,
            }
          : null,
        mainPhotoUrl,
        badges: {
          identityVerified: target?.auth?.identityVerified ?? false,
          faceMatchVerified: target?.auth?.faceMatchStatus === 'verified',
          employmentVerified: target?.auth?.employmentVerificationStatus === 'verified',
        },
      },
      reason: {
        summary: rec.reason?.summaryText ?? '',
        matchedPoints: rec.reason?.matchedPoints ?? [],
        differencePoints: rec.reason?.differencePoints ?? [],
        conversationTopics: rec.reason?.conversationTopics ?? [],
        curatorMemo: rec.reason?.curatorMemo ?? '',
      },
    };
  }

  /** Asia/Seoul 기준 오늘 00:00 (Date) */
  private todayKST(): Date {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    return new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
  }
}
