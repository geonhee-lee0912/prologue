import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { SkipDto } from './dto/skip.dto';

export interface InterestResult {
  isMutualMatch: boolean;
  matchId?: string;
  status: 'interested' | 'matched';
}

export interface InterestView {
  id: string; // UserAction id
  createdAt: Date;
  recommendationId: string | null;
  target: {
    userId: string;
    region1: string;
    region2: string | null;
    jobCategory: string | null;
    intro: string | null;
    mainPhotoUrl: string | null;
    isMatched: boolean;
  };
}

/**
 * @fr FR-E 관심 / 넘기기 / 거절 사유
 * @fr FR-F 매칭 (관심 양방향 감지 시 Match 자동 생성)
 */
@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly conversations: ConversationsService,
  ) {}

  /**
   * 추천에 대해 관심 보내기.
   * 상대도 나에게 관심을 보냈다면 자동 매칭 → Match 생성.
   */
  async sendInterest(userId: string, recommendationId: string): Promise<InterestResult> {
    const rec = await this.loadOwnedRecommendation(userId, recommendationId);
    this.ensureNotActioned(rec.status);

    const targetUserId = rec.targetUserId;

    return this.prisma.$transaction(async (tx) => {
      // 1. UserAction 생성
      await tx.userAction.create({
        data: {
          userId,
          targetUserId,
          recommendationId,
          actionType: 'send_interest',
        },
      });

      // 2. Recommendation.status → interested
      await tx.recommendation.update({
        where: { id: recommendationId },
        data: { status: 'interested' },
      });

      // 3. 상대도 나에게 관심을 보냈는지 확인
      const reverseInterest = await tx.userAction.findFirst({
        where: {
          userId: targetUserId,
          targetUserId: userId,
          actionType: 'send_interest',
        },
      });

      if (!reverseInterest) {
        return { isMutualMatch: false, status: 'interested' as const };
      }

      // 4. 매칭 생성 (UUID 정렬 보장)
      const [userAId, userBId] =
        userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

      // 이미 매칭 있으면 (재시도 등) 그대로 반환
      const existing = await tx.match.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
      });
      if (existing) {
        return {
          isMutualMatch: true,
          matchId: existing.id,
          status: 'matched' as const,
        };
      }

      const match = await tx.match.create({
        data: {
          userAId,
          userBId,
          status: 'active',
        },
      });

      // 매칭 직후 Conversation + 환영 시스템 메시지 자동 생성 (FR-G02, F03)
      await this.conversations.createForMatch(tx, match.id, userAId, userBId);

      this.logger.log(`mutual match created: ${match.id} (${userAId} ↔ ${userBId})`);

      return {
        isMutualMatch: true,
        matchId: match.id,
        status: 'matched' as const,
      };
    });
  }

  /**
   * 추천에 대해 넘기기 (거절).
   * skip_reason 은 자기 자신도 응답에서 다시 못 봄 (CLAUDE.md 9.3 / RLS).
   */
  async skip(
    userId: string,
    recommendationId: string,
    dto: SkipDto,
  ): Promise<{ skipped: true }> {
    const rec = await this.loadOwnedRecommendation(userId, recommendationId);
    this.ensureNotActioned(rec.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.userAction.create({
        data: {
          userId,
          targetUserId: rec.targetUserId,
          recommendationId,
          actionType: 'skip',
          skipReason: dto.skipReason,
          skipReasonNote: dto.skipReasonNote,
        },
      });
      await tx.recommendation.update({
        where: { id: recommendationId },
        data: { status: 'skipped' },
      });
    });

    return { skipped: true };
  }

  /**
   * 내가 보낸 관심 목록 (받은 관심은 MVP 후순위 — Plus 차별화 후보).
   */
  async listSentInterests(userId: string): Promise<InterestView[]> {
    const actions = await this.prisma.userAction.findMany({
      where: { userId, actionType: 'send_interest' },
      orderBy: { createdAt: 'desc' },
    });
    if (actions.length === 0) return [];

    const targetIds = actions.map((a) => a.targetUserId);
    const [targets, mainPhotos, matches] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: targetIds } },
        include: { profile: true },
      }),
      this.prisma.photo.findMany({
        where: { userId: { in: targetIds }, isMain: true, deletedAt: null },
      }),
      this.prisma.match.findMany({
        where: {
          status: 'active',
          OR: [
            { userAId: userId, userBId: { in: targetIds } },
            { userBId: userId, userAId: { in: targetIds } },
          ],
        },
      }),
    ]);

    const targetMap = new Map(targets.map((t) => [t.id, t]));
    const photoMap = new Map(mainPhotos.map((p) => [p.userId, p]));
    const matchedSet = new Set<string>();
    for (const m of matches) {
      matchedSet.add(m.userAId === userId ? m.userBId : m.userAId);
    }

    const result: InterestView[] = [];
    for (const a of actions) {
      const target = targetMap.get(a.targetUserId);
      const photo = photoMap.get(a.targetUserId);
      const signedUrl = photo ? await this.signPhotoUrl(photo.storageKey) : null;

      result.push({
        id: a.id,
        createdAt: a.createdAt,
        recommendationId: a.recommendationId,
        target: {
          userId: a.targetUserId,
          region1: target?.region1 ?? '',
          region2: target?.region2 ?? null,
          jobCategory: target?.profile?.jobCategory ?? null,
          intro: target?.profile?.intro ?? null,
          mainPhotoUrl: signedUrl,
          isMatched: matchedSet.has(a.targetUserId),
        },
      });
    }
    return result;
  }

  // ============================================================
  // helpers
  // ============================================================

  private async loadOwnedRecommendation(userId: string, recommendationId: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!rec || rec.userId !== userId) {
      throw new AppException(
        ErrorCode.RECOMMENDATION_NOT_FOUND,
        '추천을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    return rec;
  }

  private ensureNotActioned(status: string): void {
    if (status === 'interested') {
      throw new AppException(
        ErrorCode.ALREADY_INTERESTED,
        '이미 관심을 보냈습니다.',
        HttpStatus.CONFLICT,
      );
    }
    if (status === 'skipped') {
      throw new AppException(
        ErrorCode.ALREADY_SKIPPED,
        '이미 넘긴 추천입니다.',
        HttpStatus.CONFLICT,
      );
    }
    if (status === 'expired') {
      throw new AppException(
        ErrorCode.RECOMMENDATION_NOT_FOUND,
        '만료된 추천입니다.',
        HttpStatus.GONE,
      );
    }
  }

  private async signPhotoUrl(storageKey: string): Promise<string | null> {
    const { data } = await this.supabase.admin.storage
      .from('photos')
      .createSignedUrl(storageKey, 60 * 60);
    return data?.signedUrl ?? null;
  }
}
