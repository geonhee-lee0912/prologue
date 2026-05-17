/**
 * SMS 발송 (FR-A01 가입 OTP)
 *
 * 실제 구현체: NHN Toast / Aligo 등
 * MVP mock 은 콘솔에 코드를 찍는다.
 */
export const SMS_PROVIDER = 'SMS_PROVIDER';

export interface SmsProvider {
  /**
   * 1회용 인증코드 발송.
   * @param phoneNumber E.164 형식 권장 (+8210...)
   * @param code 6자리 숫자 권장
   */
  sendOtp(phoneNumber: string, code: string): Promise<void>;
}
