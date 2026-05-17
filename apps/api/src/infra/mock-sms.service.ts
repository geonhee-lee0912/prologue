import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider } from '@prologue/shared';

@Injectable()
export class MockSmsService implements SmsProvider {
  private readonly logger = new Logger(MockSmsService.name);

  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    // 운영 로그에 휴대폰 번호 평문 노출 금지: 뒷자리 4자리만 표기
    const masked = phoneNumber.slice(-4).padStart(phoneNumber.length, '*');
    this.logger.log(`[mock-sms] OTP ${code} → ${masked}`);
  }
}
