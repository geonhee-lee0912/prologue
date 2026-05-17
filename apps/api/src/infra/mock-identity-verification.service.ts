import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type {
  IdentityVerificationProvider,
  IdentityVerificationResult,
  IdentityVerificationStartResult,
} from '@prologue/shared';

/**
 * Mock 본인 인증 Provider
 *
 * PASS/NICE 계약 전 MVP 단계에서 사용.
 * - start: 임의 sessionId 발급, mock redirect URL 반환
 * - complete: callbackToken 으로 JSON 문자열을 받아 mock 결과 생성
 *   (모바일이 사용자에게 받은 입력값을 JSON 으로 직렬화해서 전달)
 *
 * callbackToken 포맷:
 *   '{"phoneNumber":"+821012345678","name":"홍길동","birthYear":1992,"gender":"male"}'
 *
 * 동일 (name + birthYear + gender) → 동일 ciHash → 중복 가입 방지 시뮬레이션
 */
@Injectable()
export class MockIdentityVerificationService implements IdentityVerificationProvider {
  private readonly logger = new Logger(MockIdentityVerificationService.name);

  async startVerification(): Promise<IdentityVerificationStartResult> {
    const sessionId = randomUUID();
    this.logger.log(`[mock-identity] startVerification → ${sessionId}`);
    return {
      sessionId,
      // 실제 PASS 가 반환할 redirect URL 자리. MVP 에선 모바일이 무시.
      redirectUrl: `prologue-mock://identity/complete?session=${sessionId}`,
    };
  }

  async completeVerification(
    sessionId: string,
    callbackToken: string,
  ): Promise<IdentityVerificationResult> {
    this.logger.log(`[mock-identity] completeVerification ${sessionId}`);

    let input: {
      phoneNumber?: string;
      name?: string;
      birthYear?: number;
      gender?: 'male' | 'female';
    } = {};
    try {
      input = JSON.parse(callbackToken);
    } catch {
      // 잘못된 형식 → 디폴트 mock 값 사용 (개발 편의)
    }

    const phoneNumber = input.phoneNumber ?? '+821000000000';
    const name = input.name ?? 'MockUser';
    const birthYear = input.birthYear ?? 1992;
    const gender = input.gender ?? 'male';

    // 동일인 식별 시뮬: ciHash = sha256(name + birthYear + gender)
    const ciHash = createHash('sha256')
      .update(`mock:${name}:${birthYear}:${gender}`)
      .digest('hex');

    return {
      ciHash,
      phoneNumber,
      birthYear,
      gender,
      verifiedAt: new Date(),
    };
  }
}
