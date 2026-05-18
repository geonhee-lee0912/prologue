import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import type { CurrentAdminData } from '../auth/admin-payload.types';
import type { ReviewDecisionDto } from './dto/review-decision.dto';

const PHOTOS_BUCKET = 'photos';
const SIGNED_URL_TTL_SEC = 60 * 30;

export interface PendingPhotoView {
  id: string;
  userId: string;
  photoType: string;
  isMain: boolean;
  moderationFlags: string[];
  signedUrl: string | null;
  createdAt: Date;
  user: { gender: string; birthYear: number; region1: string };
}

export interface PendingEmploymentView {
  userId: string;
  user: { gender: string; birthYear: number; region1: string; region2: string | null; status: string };
  profileJobCategory: string | null;
  employmentVerificationStatus: string;
  updatedAt: Date;
}

/**
 * @fr FR-K01 인증 검수 (08_화면목록_IA K03)
 *  - 사진 검수 (Photo.reviewStatus)
 *  - 직업/재직 인증 검수 (UserAuth.employmentVerificationStatus)
 *
 * 모든 결정은 AdminAuditLog 에 기록.
 */
@Injectable()
export class AdminReviewsService {
  private readonly logger = new Logger(AdminReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async listPendingPhotos(): Promise<PendingPhotoView[]> {
    const photos = await this.prisma.photo.findMany({
      where: { reviewStatus: 'pending', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { user: { select: { gender: true, birthYear: true, region1: true } } },
    });
    const items: PendingPhotoView[] = [];
    for (const p of photos) {
      const signedUrl = await this.signPhotoUrl(p.storageKey);
      items.push({
        id: p.id,
        userId: p.userId,
        photoType: p.photoType,
        isMain: p.isMain,
        moderationFlags: p.moderationFlags,
        signedUrl,
        createdAt: p.createdAt,
        user: p.user,
      });
    }
    return items;
  }

  async decidePhoto(
    photoId: string,
    dto: ReviewDecisionDto,
    admin: CurrentAdminData,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<{ id: string; reviewStatus: 'approved' | 'rejected' }> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.deletedAt) {
      throw new AppException(ErrorCode.NOT_FOUND, '사진을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (photo.reviewStatus !== 'pending') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '이미 검수된 사진이에요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const next: 'approved' | 'rejected' = dto.decision === 'approve' ? 'approved' : 'rejected';

    await this.prisma.$transaction([
      this.prisma.photo.update({
        where: { id: photoId },
        data: { reviewStatus: next },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.adminId,
          action: dto.decision === 'approve' ? 'approve_photo' : 'reject_photo',
          targetType: 'photo',
          targetId: photoId,
          metadata: { reason: dto.reason ?? null },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    this.logger.log(`photo ${photoId} -> ${next} by admin ${admin.adminId}`);
    return { id: photoId, reviewStatus: next };
  }

  async listPendingEmployment(): Promise<PendingEmploymentView[]> {
    const auths = await this.prisma.userAuth.findMany({
      where: { employmentVerificationStatus: 'pending' },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      include: {
        user: {
          select: {
            gender: true,
            birthYear: true,
            region1: true,
            region2: true,
            status: true,
            profile: { select: { jobCategory: true } },
          },
        },
      },
    });
    return auths.map((a) => ({
      userId: a.userId,
      user: {
        gender: a.user.gender,
        birthYear: a.user.birthYear,
        region1: a.user.region1,
        region2: a.user.region2,
        status: a.user.status,
      },
      profileJobCategory: a.user.profile?.jobCategory ?? null,
      employmentVerificationStatus: a.employmentVerificationStatus,
      updatedAt: a.updatedAt,
    }));
  }

  async decideEmployment(
    userId: string,
    dto: ReviewDecisionDto,
    admin: CurrentAdminData,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<{ userId: string; employmentVerificationStatus: 'verified' | 'rejected' }> {
    const auth = await this.prisma.userAuth.findUnique({ where: { userId } });
    if (!auth) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        '인증 정보를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (auth.employmentVerificationStatus !== 'pending') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '대기 중인 신청이 아니에요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const next: 'verified' | 'rejected' = dto.decision === 'approve' ? 'verified' : 'rejected';

    await this.prisma.$transaction([
      this.prisma.userAuth.update({
        where: { userId },
        data: {
          employmentVerificationStatus: next,
          employmentVerifiedAt: next === 'verified' ? new Date() : null,
        },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.adminId,
          action:
            dto.decision === 'approve'
              ? 'approve_employment_verification'
              : 'reject_employment_verification',
          targetType: 'employment_auth',
          targetId: userId,
          metadata: { reason: dto.reason ?? null },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    this.logger.log(`employment ${userId} -> ${next} by admin ${admin.adminId}`);
    return { userId, employmentVerificationStatus: next };
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
