import { POLICY } from '@prologue/shared';

export interface CasualOfferInput {
  speechLevel: 'mixed' | 'casual';
  casualOfferedAt: Date | null;
  /** 알게 된 순간 = 첫 리포트를 건넨 때 */
  knownAt: Date | null;
  userUsedCasual: boolean;
  sensitiveJustNow: boolean;
  crisis: boolean;
  skipped: boolean;
  now: Date;
}

/**
 * 말 놓기를 꺼낼 때 (AI 엔진 문서 5.2) — 사용자가 반말을 쓰기 시작했거나, 첫 리포트를 건넨 뒤 다음 대화에서. 한 번만
 * 민감한 이야기·위기·건너뛰기 직후에는 꺼내지 않는다 (갈피 문서 3.4 "묻지 않는 순간")
 */
export function shouldOfferCasual(input: CasualOfferInput): boolean {
  if (input.speechLevel !== 'mixed' || input.casualOfferedAt) return false;
  if (input.sensitiveJustNow || input.crisis || input.skipped) return false;
  if (input.userUsedCasual) return true;
  return input.knownAt !== null && input.now.getTime() - input.knownAt.getTime() >= POLICY.galpi.casualOfferDelayMinutes * 60_000;
}
