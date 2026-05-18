import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ReportStatus, type Prisma } from '@prisma/client';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentAdminData } from '../auth/admin-payload.types';
import type { ResolveReportAction, ResolveReportDto } from './dto/resolve-report.dto';

export interface ReportListItem {
  id: string;
  reportType: string;
  status: string;
  createdAt: Date;
  reporter: { id: string; gender: string; birthYear: number };
  targetUser: { id: string; gender: string; birthYear: number; status: string };
}

export interface ReportDetailView {
  id: string;
  reportType: string;
  description: string | null;
  status: string;
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  reporter: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
  };
  targetUser: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
    profile: { jobCategory: string | null; intro: string | null } | null;
    pastReportCount: number;
  };
  conversation: {
    id: string;
    status: string;
    messages: Array<{ id: string; senderId: string | null; messageType: string; content: string; createdAt: Date }>;
  } | null;
  reportedMessage: { id: string; senderId: string | null; content: string; createdAt: Date } | null;
}

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: { status?: ReportStatus | 'all'; page?: number; pageSize?: number },
  ): Promise<{ items: ReportListItem[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

    const where: Prisma.ReportWhereInput =
      filter.status && filter.status !== 'all' ? { status: filter.status } : {};

    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, gender: true, birthYear: true } },
          targetUser: { select: { id: true, gender: true, birthYear: true, status: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter,
        targetUser: r.targetUser,
      })),
      total,
    };
  }

  async getDetail(reportId: string): Promise<ReportDetailView> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, gender: true, birthYear: true, region1: true, region2: true, status: true } },
        targetUser: {
          select: {
            id: true,
            gender: true,
            birthYear: true,
            region1: true,
            region2: true,
            status: true,
            profile: { select: { jobCategory: true, intro: true } },
          },
        },
      },
    });
    if (!report) {
      throw new AppException(ErrorCode.NOT_FOUND, '신고를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const pastReportCount = await this.prisma.report.count({
      where: { targetUserId: report.targetUserId, id: { not: report.id } },
    });

    let conversation: ReportDetailView['conversation'] = null;
    if (report.conversationId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: report.conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (conv) {
        conversation = {
          id: conv.id,
          status: conv.status,
          messages: conv.messages.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            messageType: m.messageType,
            content: m.content,
            createdAt: m.createdAt,
          })),
        };
      }
    }

    let reportedMessage: ReportDetailView['reportedMessage'] = null;
    if (report.messageId) {
      const msg = await this.prisma.message.findUnique({ where: { id: report.messageId } });
      if (msg) {
        reportedMessage = {
          id: msg.id,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
        };
      }
    }

    return {
      id: report.id,
      reportType: report.reportType,
      description: report.description,
      status: report.status,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      reporter: report.reporter,
      targetUser: { ...report.targetUser, pastReportCount },
      conversation,
      reportedMessage,
    };
  }

  async resolve(
    reportId: string,
    dto: ResolveReportDto,
    admin: CurrentAdminData,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<ReportDetailView> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new AppException(ErrorCode.NOT_FOUND, '신고를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (report.status === 'resolved' || report.status === 'rejected') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '이미 처리된 신고예요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newStatus: ReportStatus = dto.action === 'dismiss' ? 'rejected' : 'resolved';
    const shouldSuspend =
      dto.action === 'resolve_suspended' || dto.suspendTarget === true;

    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          resolutionNote: dto.note ?? null,
          resolvedAt: new Date(),
        },
      });
      if (shouldSuspend) {
        await tx.user.update({
          where: { id: report.targetUserId },
          data: { status: 'suspended' },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.adminId,
          action: this.actionToAuditCode(dto.action),
          targetType: 'report',
          targetId: report.id,
          metadata: {
            targetUserId: report.targetUserId,
            suspendApplied: shouldSuspend,
            hasNote: !!dto.note,
          },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    this.logger.log(
      `report ${reportId} resolved (action=${dto.action}, suspended=${shouldSuspend}) by admin ${admin.adminId}`,
    );

    return this.getDetail(reportId);
  }

  private actionToAuditCode(action: ResolveReportAction): string {
    switch (action) {
      case 'dismiss':
        return 'dismiss_report';
      case 'resolve_no_action':
        return 'resolve_report_no_action';
      case 'resolve_warned':
        return 'resolve_report_warned';
      case 'resolve_suspended':
        return 'resolve_report_suspended';
    }
  }
}
