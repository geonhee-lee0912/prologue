import { LlmError } from '@prologue/shared';

/** 로그에 쓸 수 있는 오류 이름 — 식별자 모양만. 아니면 Error 로 쓴다 */
const SAFE_NAME = /^[A-Za-z_$][\w$]{0,63}$/;
/** Prisma 오류 code — P2002 처럼 P 와 숫자 넷 */
const PRISMA_CODE = /^P\d{4}$/;

/**
 * 로그에 남길 오류 설명 — 401·429·시간 초과·DB 오류를 가를 칸만 쓴다 (CLAUDE.md 10.3).
 * - LlmError: 이름과 상태·code·시간 초과 (LlmError status=429 code=rate_limit_exceeded, LlmError timeout)
 * - Prisma 오류: 이름과 code (PrismaClientKnownRequestError code=P2002)
 * - 다른 Error 는 이름, Error 가 아니면 typeof
 * message 는 쓰지 않는다 — 사용자 말, LLM 응답 본문(가린 키 조각), 쓰려던 값이 담길 수 있다
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const name = SAFE_NAME.test(error.name) ? error.name : 'Error';
  if (error instanceof LlmError) {
    const parts = [name];
    if (Number.isInteger(error.status)) parts.push(`status=${error.status}`);
    if (LlmError.isCode(error.code)) parts.push(`code=${error.code}`);
    if (error.timeout) parts.push('timeout');
    return parts.join(' ');
  }
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === 'string' && PRISMA_CODE.test(code) ? `${name} code=${code}` : name;
}
