import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBlockDto } from './dto/create-block.dto';
import type { CreateReportDto } from './dto/create-report.dto';

/**
 * @fr FR-H01 신고
 * @fr FR-H02 차단
 *
 * 정책:
 * - 자기 자신 신고/차단 불가.
 * - 차단은 양방향으로 작동 — Block.blockerId → blockedId 한 쌍.
 *   추천 후보 필터에서 양방향 차단 모두 제외 (recommendations.service).
 * - 차단 시 진행 중 대화방은 'blocked' 처리.
 * - 신고 description / resolutionNote 는 사용자 응답에 절대 노출 금지.
 */
@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, dto: CreateReportDto): Promise<{ id: string }> {
    if (dto.targetUserId === userId) {
      throw new AppException(
        ErrorCode.CANNOT_REPORT_SELF,
        '자기 자신은 신고할 수 없어요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const target = await this.prisma.user.findUnique({ where: { id: dto.targetUserId } });
    if (!target) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        '대상 사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetUserId: dto.targetUserId,
        reportType: dto.reportType,
        description: dto.description,
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        status: 'pending',
      },
    });

    // user_actions 에 흔적 (운영 데이터)
    await this.prisma.userAction
      .create({
        data: {
          userId,
          targetUserId: dto.targetUserId,
          actionType: 'report_request',
        },
      })
      .catch(() => null);

    this.logger.log(`report created: ${report.id} (reporter=${userId})`);
    return { id: report.id };
  }

  async createBlock(userId: string, dto: CreateBlockDto): Promise<{ id: string }> {
    if (dto.blockedId === userId) {
      throw new AppException(
        ErrorCode.CANNOT_BLOCK_SELF,
        '자기 자신은 차단할 수 없어요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const target = await this.prisma.user.findUnique({ where: { id: dto.blockedId } });
    if (!target) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        '대상 사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: dto.blockedId } },
    });
    if (existing) {
      throw new AppException(
        ErrorCode.ALREADY_BLOCKED,
        '이미 차단한 사용자입니다.',
        HttpStatus.CONFLICT,
      );
    }

    const block = await this.prisma.$transaction(async (tx) => {
      const created = await tx.block.create({
        data: { blockerId: userId, blockedId: dto.blockedId },
      });

      // 진행 중 대화방은 'blocked' 로 종료
      const [userAId, userBId] =
        userId < dto.blockedId ? [userId, dto.blockedId] : [dto.blockedId, userId];
      await tx.conversation.updateMany({
        where: {
          userAId,
          userBId,
          status: 'active',
        },
        data: {
          status: 'blocked',
          endedAt: new Date(),
          endReason: 'block',
        },
      });

      // 매치도 blocked 처리
      await tx.match.updateMany({
        where: { userAId, userBId, status: 'active' },
        data: { status: 'blocked', endedAt: new Date(), endReason: 'block' },
      });

      // user_actions 흔적
      await tx.userAction
        .create({
          data: {
            userId,
            targetUserId: dto.blockedId,
            actionType: 'block_request',
          },
        })
        .catch(() => null);

      return created;
    });

    this.logger.log(`block created: ${block.id} (blocker=${userId})`);
    return { id: block.id };
  }
}
