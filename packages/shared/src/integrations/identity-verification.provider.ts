/**
 * 본인 인증 (FR-B01) — PASS / NICE
 *
 * 흐름: 세션 시작 → 사용자가 외부 페이지에서 인증 → 콜백 토큰으로 결과 조회.
 *
 * 보안 원칙: 이름은 어떤 경로로도 저장하지 않는다.
 * 검증 후 즉시 폐기. ciHash 만 보관.
 */
export const IDENTITY_VERIFICATION_PROVIDER = 'IDENTITY_VERIFICATION_PROVIDER';

export interface IdentityVerificationStartResult {
  sessionId: string;
  /** 사용자 모바일이 열어야 할 외부 인증 URL */
  redirectUrl: string;
}

export interface IdentityVerificationResult {
  /** 본인 식별값을 해시한 결과 (CI hash). 동일인 중복 가입 방지용 */
  ciHash: string;
  /** E.164 형식 휴대폰 번호 (예: +821012345678). 평문은 즉시 해시 후 폐기 */
  phoneNumber: string;
  birthYear: number;
  gender: 'male' | 'female';
  verifiedAt: Date;
}

export interface IdentityVerificationProvider {
  startVerification(): Promise<IdentityVerificationStartResult>;
  completeVerification(
    sessionId: string,
    callbackToken: string,
  ): Promise<IdentityVerificationResult>;
}
