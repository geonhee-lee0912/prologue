import { createHash } from 'node:crypto';

/**
 * 휴대폰 번호 해시.
 *
 * 평문 휴대폰은 OTP/본인 인증 검증 동안만 메모리에 보관하고,
 * 영구 저장은 SHA-256(phone:pepper) 만 한다.
 *
 * - phone: E.164 형식 권장 (+821012345678)
 * - pepper: PHONE_HASH_PEPPER 환경변수 (64자 hex)
 */
export function hashPhone(phoneNumber: string, pepper: string): string {
  if (!pepper || pepper.length < 32) {
    throw new Error('PHONE_HASH_PEPPER 값이 너무 짧거나 비어있습니다.');
  }
  return createHash('sha256').update(`${phoneNumber}:${pepper}`).digest('hex');
}
