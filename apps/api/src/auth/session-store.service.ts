import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

interface IdentitySession {
  startedAt: number;
}

/**
 * 본인 인증 세션 임시 저장소 (in-memory).
 *
 * MVP 단계 단순 구현. Phase 6 에서 Upstash Redis 로 교체 예정.
 * - TTL: 5분
 * - 1분마다 만료 항목 정리
 *
 * 분산 배포 시 단일 인스턴스 한계 있음 — Railway 단일 인스턴스 MVP 까지만 유효.
 */
@Injectable()
export class SessionStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionStoreService.name);
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly store = new Map<string, IdentitySession>();
  private cleanupTimer?: NodeJS.Timeout;

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }

  start(sessionId: string): void {
    this.store.set(sessionId, { startedAt: Date.now() });
  }

  has(sessionId: string): boolean {
    const s = this.store.get(sessionId);
    if (!s) return false;
    if (Date.now() - s.startedAt > this.TTL_MS) {
      this.store.delete(sessionId);
      return false;
    }
    return true;
  }

  delete(sessionId: string): void {
    this.store.delete(sessionId);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [id, s] of this.store.entries()) {
      if (now - s.startedAt > this.TTL_MS) {
        this.store.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`expired ${removed} identity sessions`);
    }
  }
}
