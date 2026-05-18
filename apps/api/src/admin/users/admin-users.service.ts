import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserStatus, type Prisma } from '@prisma/client';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentAdminData } from '../auth/admin-payload.types';

export interface AdminUserListItem {
  id: string;
  gender: string;
  birthYear: number;
  region1: string;
  region2: string | null;
  status: string;
  membershipType: string;
  createdAt: Date;
  loginProvider: string;
  identityVerified: boolean;
  faceMatchStatus: string;
  reportsReceivedCount: number;
}

export interface AdminUserDetailView extends AdminUserListItem {
  profile: {
    intro: string | null;
    jobCategory: string | null;
    lifestyleTags: string[];
    completionScore: number;
  } | null;
  verification: {
    identityVerifiedAt: Date | null;
    faceVerifiedAt: Date | null;
    ageVerified: boolean;
    mannerPledgeAgreed: boolean;
    singlePledgeAgreed: boolean;
    employmentVerificationStatus: string;
  };
  relationshipPreference: {
    intent: string;
    pace: string;
    contactFrequency: string;
  } | null;
  withdrawnAt: Date | null;
  lastReports: Array<{
    id: string;
    reportType: string;
    status: string;
    createdAt: Date;
    isReporter: boolean;
  }>;
}

const PAGE_SIZE_MAX = 100;

/**
 * @fr FR-K01 사용자 목록 조회 (운영자)
 *
 * 휴대폰/이메일/카카오ID 등 개인 식별자는 응답에 포함하지 않는다 (CLAUDE.md 10.2).
 * 운영자에게는 id + 인증·신고 상태로 사용자 식별을 충분히 제공.
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(filter: {
    q?: string;
    status?: UserStatus | 'all';
    identityVerified?: boolean;
    faceVerified?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AdminUserListItem[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, filter.pageSize ?? 20));

    const where: Prisma.UserWhereInput = {};
    if (filter.status && filter.status !== 'all') where.status = filter.status;
    if (filter.q?.trim()) {
      const q = filter.q.trim();
      const orClauses: Prisma.UserWhereInput[] = [
        { region1: { contains: q, mode: 'insensitive' } },
        { region2: { contains: q, mode: 'insensitive' } },
      ];
      // UUID 전체가 입력되면 id 정확 매치도 추가
      if (/^[0-9a-fA-F-]{32,36}$/.test(q)) {
        orClauses.push({ id: q });
      }
      where.OR = orClauses;
    }
    const authFilter: Prisma.UserAuthWhereInput = {};
    if (filter.identityVerified !== undefined) {
      authFilter.identityVerified = filter.identityVerified;
    }
    if (filter.faceVerified !== undefined) {
      authFilter.faceMatchStatus = filter.faceVerified ? 'verified' : { not: 'verified' };
    }
    if (Object.keys(authFilter).length > 0) {
      where.auth = authFilter;
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          auth: { select: { identityVerified: true, faceMatchStatus: true } },
          _count: { select: { reportsReceived: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((u) => ({
        id: u.id,
        gender: u.gender,
        birthYear: u.birthYear,
        region1: u.region1,
        region2: u.region2,
        status: u.status,
        membershipType: u.membershipType,
        createdAt: u.createdAt,
        loginProvider: u.loginProvider,
        identityVerified: u.auth?.identityVerified ?? false,
        faceMatchStatus: u.auth?.faceMatchStatus ?? 'not_submitted',
        reportsReceivedCount: u._count.reportsReceived,
      })),
      total,
    };
  }

  async getDetail(userId: string): Promise<AdminUserDetailView> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
        profile: true,
        relationshipPreference: true,
        _count: { select: { reportsReceived: true } },
      },
    });
    if (!u) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const lastReports = await this.prisma.report.findMany({
      where: { OR: [{ targetUserId: userId }, { reporterId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      id: u.id,
      gender: u.gender,
      birthYear: u.birthYear,
      region1: u.region1,
      region2: u.region2,
      status: u.status,
      membershipType: u.membershipType,
      createdAt: u.createdAt,
      loginProvider: u.loginProvider,
      identityVerified: u.auth?.identityVerified ?? false,
      faceMatchStatus: u.auth?.faceMatchStatus ?? 'not_submitted',
      reportsReceivedCount: u._count.reportsReceived,
      profile: u.profile
        ? {
            intro: u.profile.intro,
            jobCategory: u.profile.jobCategory,
            lifestyleTags: u.profile.lifestyleTags,
            completionScore: u.profile.completionScore,
          }
        : null,
      verification: {
        identityVerifiedAt: u.auth?.identityVerifiedAt ?? null,
        faceVerifiedAt: u.auth?.faceVerifiedAt ?? null,
        ageVerified: u.auth?.ageVerified ?? false,
        mannerPledgeAgreed: u.auth?.mannerPledgeAgreed ?? false,
        singlePledgeAgreed: u.auth?.singlePledgeAgreed ?? false,
        employmentVerificationStatus: u.auth?.employmentVerificationStatus ?? 'not_submitted',
      },
      relationshipPreference: u.relationshipPreference
        ? {
            intent: u.relationshipPreference.intent,
            pace: u.relationshipPreference.pace,
            contactFrequency: u.relationshipPreference.contactFrequency,
          }
        : null,
      withdrawnAt: u.withdrawnAt,
      lastReports: lastReports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        status: r.status,
        createdAt: r.createdAt,
        isReporter: r.reporterId === userId,
      })),
    };
  }

  /** 운영자가 사용자 정지 (예: 신고 처리 외 직접 조치) */
  async setStatus(
    userId: string,
    status: 'active' | 'suspended',
    admin: CurrentAdminData,
    note: string | undefined,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<AdminUserDetailView> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) {
      throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (u.status === 'withdrawn') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '탈퇴한 사용자입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (u.status === status) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '이미 동일한 상태예요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status } }),
      this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.adminId,
          action: status === 'suspended' ? 'suspend_user' : 'reactivate_user',
          targetType: 'user',
          targetId: userId,
          metadata: { note: note ?? null },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    this.logger.log(`user ${userId} ${status} by admin ${admin.adminId}`);
    return this.getDetail(userId);
  }
}
