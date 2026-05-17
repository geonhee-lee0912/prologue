import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type {
  IdentityVerificationProvider,
  IdentityVerificationResult,
  IdentityVerificationStartResult,
} from '@prologue/shared';

@Injectable()
export class MockIdentityVerificationService implements IdentityVerificationProvider {
  private readonly logger = new Logger(MockIdentityVerificationService.name);

  async startVerification(): Promise<IdentityVerificationStartResult> {
    const sessionId = randomUUID();
    this.logger.log(`[mock-identity] startVerification → ${sessionId}`);
    return {
      sessionId,
      redirectUrl: `https://mock-pass.example/verify?session=${sessionId}`,
    };
  }

  async completeVerification(
    sessionId: string,
    _callbackToken: string,
  ): Promise<IdentityVerificationResult> {
    this.logger.log(`[mock-identity] completeVerification ${sessionId}`);
    // sessionId 를 해시해서 결정적이지만 평문 노출 없는 ciHash 생성
    const ciHash = createHash('sha256').update(`mock:${sessionId}`).digest('hex');
    return {
      ciHash,
      birthYear: 1992,
      gender: 'male',
      verifiedAt: new Date(),
    };
  }
}
