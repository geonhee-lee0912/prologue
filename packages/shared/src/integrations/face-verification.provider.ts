/**
 * 얼굴 인증 (FR-B02)
 *
 * 본인 인증 시 제출한 신분증 사진과 라이브 셀피의 동일인 여부를 판별.
 * 실제 구현체: AWS Rekognition CompareFaces / NAVER Clova
 *
 * 보안: 두 이미지 모두 짧은 TTL 서명 URL. 결과만 보관, 이미지는 24시간 후 삭제.
 */
export const FACE_VERIFICATION_PROVIDER = 'FACE_VERIFICATION_PROVIDER';

export interface FaceVerificationResult {
  matched: boolean;
  /** 0~100. mock 은 95 고정 */
  confidence: number;
}

export interface FaceVerificationProvider {
  matchFaces(idPhotoUrl: string, livePhotoUrl: string): Promise<FaceVerificationResult>;
}
