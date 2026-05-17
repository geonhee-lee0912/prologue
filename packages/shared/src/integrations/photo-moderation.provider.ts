/**
 * 사진 자동 검수 (FR-C02)
 *
 * 업로드된 프로필 사진의 NSFW / 폭력 / 미성년자 의심 등을 자동 탐지.
 * 운영자 수동 검수를 줄이기 위한 1차 필터.
 *
 * 실제 구현체: AWS Rekognition Moderation
 */
export const PHOTO_MODERATION_PROVIDER = 'PHOTO_MODERATION_PROVIDER';

export interface PhotoModerationResult {
  /** 탐지된 플래그. 예: ['nsfw'], ['violence'], [] */
  flags: string[];
}

export interface PhotoModerationProvider {
  moderate(imageUrl: string): Promise<PhotoModerationResult>;
}
