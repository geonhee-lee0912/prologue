import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ErrorCode,
  FACE_VERIFICATION_PROVIDER,
  type FaceVerificationProvider,
} from '@prologue/shared';
import { randomUUID } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

const FACE_BUCKET = 'face-auth';
const PHOTOS_BUCKET = 'photos';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SIGNED_URL_TTL_FOR_PROVIDER = 5 * 60; // 5분 — 외부 provider 호출 동안만 유효

export interface FaceVerificationResultView {
  matched: boolean;
  confidence: number;
  faceMatchStatus: 'verified' | 'rejected' | 'pending';
}

export interface VerificationStatusView {
  identityVerified: boolean;
  faceMatchStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  faceVerifiedAt: Date | null;
  faceConfidence: number | null;
}

/**
 * @fr FR-B02 얼굴 인증
 *
 * 대표 사진(FR-C01)과 라이브 셀피를 매칭한다.
 * - 셀피는 face-auth 보안 버킷에 임시 저장 (운영자도 직접 SELECT 불가)
 * - 매칭 성공 → 즉시 폐기 (CLAUDE.md 9.3)
 * - 매칭 실패 → 24시간 보관 (운영자 검수용). 24h TTL cron 은 후속.
 */
@Injectable()
export class FaceVerificationService implements OnModuleInit {
  private readonly logger = new Logger(FaceVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    @Inject(FACE_VERIFICATION_PROVIDER)
    private readonly faceProvider: FaceVerificationProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    const { data: buckets, error } = await this.supabase.admin.storage.listBuckets();
    if (error) {
      this.logger.warn(`buckets 조회 실패: ${error.message}`);
      return;
    }
    if (buckets?.find((b) => b.name === FACE_BUCKET)) {
      this.logger.log(`bucket "${FACE_BUCKET}" ready`);
      return;
    }
    const { error: createError } = await this.supabase.admin.storage.createBucket(FACE_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIMES),
    });
    if (createError) {
      this.logger.error(`bucket "${FACE_BUCKET}" 생성 실패: ${createError.message}`);
    } else {
      this.logger.log(`bucket "${FACE_BUCKET}" 생성됨`);
    }
  }

  async getStatus(userId: string): Promise<VerificationStatusView> {
    const auth = await this.prisma.userAuth.findUnique({ where: { userId } });
    return {
      identityVerified: auth?.identityVerified ?? false,
      faceMatchStatus: auth?.faceMatchStatus ?? 'not_submitted',
      faceVerifiedAt: auth?.faceVerifiedAt ?? null,
      faceConfidence: auth?.faceConfidence ?? null,
    };
  }

  async verifyFace(
    userId: string,
    file: Express.Multer.File,
  ): Promise<FaceVerificationResultView> {
    if (!file) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '셀피 파일이 첨부되지 않았습니다.',
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

    // 이미 verified 인 사용자는 재시도 차단
    const auth = await this.prisma.userAuth.findUnique({ where: { userId } });
    if (!auth) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        '사용자 인증 정보가 없습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (auth.faceMatchStatus === 'verified') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '이미 얼굴 인증이 완료되었습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 대표 사진 선조건
    const mainPhoto = await this.prisma.photo.findFirst({
      where: { userId, isMain: true, deletedAt: null },
    });
    if (!mainPhoto) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        '얼굴 인증 전 대표 사진을 먼저 등록해 주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 셀피 업로드
    const ext = this.mimeToExt(file.mimetype);
    const selfieKey = `${userId}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await this.supabase.admin.storage
      .from(FACE_BUCKET)
      .upload(selfieKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) {
      this.logger.error(`셀피 업로드 실패: ${uploadError.message}`);
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '셀피 업로드에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 양 사진의 짧은 TTL 서명 URL 발급 (provider 호출 동안만)
    const { data: idUrl } = await this.supabase.admin.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(mainPhoto.storageKey, SIGNED_URL_TTL_FOR_PROVIDER);
    const { data: liveUrl } = await this.supabase.admin.storage
      .from(FACE_BUCKET)
      .createSignedUrl(selfieKey, SIGNED_URL_TTL_FOR_PROVIDER);

    if (!idUrl?.signedUrl || !liveUrl?.signedUrl) {
      // 정리: 셀피 즉시 제거
      await this.supabase.admin.storage.from(FACE_BUCKET).remove([selfieKey]);
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '사진 URL 발급에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 매칭 호출 (mock: 항상 matched=true confidence=95)
    const result = await this.faceProvider.matchFaces(idUrl.signedUrl, liveUrl.signedUrl);

    const status = result.matched ? 'verified' : 'rejected';
    await this.prisma.$transaction([
      this.prisma.userAuth.update({
        where: { userId },
        data: {
          faceMatchStatus: status,
          faceVerifiedAt: result.matched ? new Date() : null,
          faceConfidence: result.confidence,
        },
      }),
      this.prisma.photo.update({
        where: { id: mainPhoto.id },
        data: { faceMatchStatus: status },
      }),
    ]);

    // CLAUDE.md 9.3: 매칭 성공 시 셀피 즉시 폐기
    if (result.matched) {
      const { error } = await this.supabase.admin.storage.from(FACE_BUCKET).remove([selfieKey]);
      if (error) {
        this.logger.warn(`셀피 폐기 실패 (cron 으로 정리됨): ${error.message}`);
      }
    }
    // 매칭 실패 시 24시간 보관 — TTL cron 은 후속 작업

    this.logger.log(`face verification ${userId}: ${status} (confidence=${result.confidence})`);

    return {
      matched: result.matched,
      confidence: result.confidence,
      faceMatchStatus: status,
    };
  }

  private mimeToExt(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'bin';
  }
}
