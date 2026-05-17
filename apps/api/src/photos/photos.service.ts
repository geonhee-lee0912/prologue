import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Photo } from '@prisma/client';
import {
  ErrorCode,
  PHOTO_MODERATION_PROVIDER,
  type PhotoModerationProvider,
} from '@prologue/shared';
import { randomUUID } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

const BUCKET = 'photos';
const MAX_PHOTOS_PER_USER = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SIGNED_URL_TTL = 60 * 60; // 1시간

export interface PhotoView {
  id: string;
  photoType: 'main' | 'daily' | 'hobby';
  isMain: boolean;
  reviewStatus: string;
  moderationFlags: string[];
  signedUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class PhotosService implements OnModuleInit {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    @Inject(PHOTO_MODERATION_PROVIDER)
    private readonly moderation: PhotoModerationProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
    if (listError) {
      this.logger.warn(`buckets 조회 실패: ${listError.message}`);
      return;
    }
    if (buckets?.find((b) => b.name === BUCKET)) {
      this.logger.log(`bucket "${BUCKET}" ready`);
      return;
    }
    const { error } = await this.supabase.admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIMES),
    });
    if (error) {
      this.logger.error(`bucket "${BUCKET}" 생성 실패: ${error.message}`);
    } else {
      this.logger.log(`bucket "${BUCKET}" 생성됨`);
    }
  }

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    photoType: 'main' | 'daily' | 'hobby' = 'daily',
  ): Promise<PhotoView> {
    if (!file) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '파일이 첨부되지 않았습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '지원하지 않는 파일 형식입니다 (JPEG, PNG, WEBP 만 허용).',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '파일 크기는 5MB 이하여야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingCount = await this.prisma.photo.count({
      where: { userId, deletedAt: null },
    });
    if (existingCount >= MAX_PHOTOS_PER_USER) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        `사진은 최대 ${MAX_PHOTOS_PER_USER}장까지 등록할 수 있습니다.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const ext = this.mimeToExt(file.mimetype);
    const storageKey = `${userId}/${randomUUID()}.${ext}`;

    // 1. mock 사진 검수 (현재는 항상 통과)
    const moderation = await this.moderation.moderate(storageKey);

    // 2. Supabase Storage 업로드
    const { error: uploadError } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) {
      this.logger.error(`storage 업로드 실패: ${uploadError.message}`);
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '사진 업로드에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 3. Photo 레코드 생성 — 첫 사진이면 자동 메인
    const photo = await this.prisma.photo.create({
      data: {
        userId,
        photoType,
        storageKey,
        isMain: existingCount === 0,
        moderationFlags: moderation.flags,
        reviewStatus: moderation.flags.length === 0 ? 'approved' : 'pending',
      },
    });

    return this.toView(photo);
  }

  async listMyPhotos(userId: string): Promise<PhotoView[]> {
    const photos = await this.prisma.photo.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    });
    return Promise.all(photos.map((p) => this.toView(p)));
  }

  async deletePhoto(userId: string, photoId: string): Promise<{ deleted: true }> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.userId !== userId || photo.deletedAt !== null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        '사진을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.photo.update({
      where: { id: photoId },
      data: { deletedAt: new Date(), isMain: false },
    });

    // 메인 사진이 삭제되었다면 남은 사진 중 가장 오래된 걸 자동 메인
    if (photo.isMain) {
      const next = await this.prisma.photo.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.photo.update({
          where: { id: next.id },
          data: { isMain: true },
        });
      }
    }

    // Storage 에서도 제거 (실패해도 응답은 성공 — orphan 은 cron 으로 청소)
    const { error } = await this.supabase.admin.storage.from(BUCKET).remove([photo.storageKey]);
    if (error) {
      this.logger.warn(`storage 삭제 실패 (orphan 처리 예정): ${error.message}`);
    }

    return { deleted: true };
  }

  async setMain(userId: string, photoId: string): Promise<PhotoView[]> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.userId !== userId || photo.deletedAt !== null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        '사진을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (photo.reviewStatus === 'rejected') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '반려된 사진은 대표 사진으로 지정할 수 없습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.photo.updateMany({
        where: { userId, isMain: true },
        data: { isMain: false },
      }),
      this.prisma.photo.update({
        where: { id: photoId },
        data: { isMain: true },
      }),
    ]);

    return this.listMyPhotos(userId);
  }

  private async toView(photo: Photo): Promise<PhotoView> {
    const { data } = await this.supabase.admin.storage
      .from(BUCKET)
      .createSignedUrl(photo.storageKey, SIGNED_URL_TTL);

    return {
      id: photo.id,
      photoType: photo.photoType,
      isMain: photo.isMain,
      reviewStatus: photo.reviewStatus,
      moderationFlags: photo.moderationFlags,
      signedUrl: data?.signedUrl ?? null,
      createdAt: photo.createdAt,
    };
  }

  private mimeToExt(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'bin';
  }
}
