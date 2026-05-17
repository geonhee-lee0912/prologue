import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

interface OtpEntry {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

const TTL_MS = 3 * 60 * 1000; // 3분 (POLICY.account.smsOtpTtlSeconds 와 동기)
const MAX_ATTEMPTS = 5; // POLICY.account.smsOtpMaxAttempts

export type OtpVerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

/**
 * SMS OTP 임시 저장소 (in-memory).
 *
 * - Key: phoneHash (휴대폰 평문 X)
 * - Value: bcrypt 해시된 코드 + 만료시각 + 시도 횟수
 * - TTL: 3분, 최대 5회 시도
 * - 1분마다 만료 항목 cleanup
 *
 * Phase 6 에서 Upstash Redis 로 교체.
 */
@Injectable()
export class OtpStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtpStoreService.name);
  private readonly store = new Map<string, OtpEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
  }

  async issue(phoneHash: string, code: string): Promise<void> {
    const codeHash = await bcrypt.hash(code, 10);
    this.store.set(phoneHash, {
      codeHash,
      expiresAt: Date.now() + TTL_MS,
      attempts: 0,
    });
  }

  async verify(phoneHash: string, code: string): Promise<OtpVerifyResult> {
    const entry = this.store.get(phoneHash);
    if (!entry) return 'invalid';
    if (Date.now() > entry.expiresAt) {
      this.store.delete(phoneHash);
      return 'expired';
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      this.store.delete(phoneHash);
      return 'too_many_attempts';
    }
    entry.attempts++;
    const ok = await bcrypt.compare(code, entry.codeHash);
    if (!ok) return 'invalid';
    this.store.delete(phoneHash); // 성공 시 즉시 삭제
    return 'ok';
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) {
        this.store.delete(k);
        removed++;
      }
    }
    if (removed > 0) this.logger.debug(`expired ${removed} OTP entries`);
  }
}
