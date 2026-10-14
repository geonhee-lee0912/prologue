import { LlmError } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { describeError } from './describe-error';

/** Prisma 가 던지는 오류 꼴 — 이름과 code(P2002 …), 메시지에는 쓰려던 값이 담길 수 있다 */
const prismaLike = (code: unknown) =>
  Object.assign(new Error('Unique constraint failed on the fields: (`user_id`) 저는 지은이고 010-1234-5678'), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

describe('로그에 남길 오류 설명 — 원인을 가를 칸만, 메시지는 쓰지 않는다 (CLAUDE.md 10.3)', () => {
  it('LlmError 는 이름과 상태·code·시간 초과', () => {
    expect(describeError(new LlmError('LLM 호출 실패 (429)', { status: 429, code: 'rate_limit_exceeded' }))).toBe(
      'LlmError status=429 code=rate_limit_exceeded',
    );
    expect(describeError(new LlmError('LLM 호출 실패 (500)', { status: 500 }))).toBe('LlmError status=500');
    expect(describeError(new LlmError('LLM 호출 시간 초과 (30000ms)', { timeout: true }))).toBe('LlmError timeout');
  });

  it('LlmError 는 식별자 모양이 아닌 code 를 처음부터 담지 않는다', () => {
    const error = new LlmError('LLM 호출 실패 (401)', { status: 401, code: 'Incorrect API key provided: sk-SENTINEL' });
    expect(error.code).toBeUndefined();
    expect(describeError(error)).toBe('LlmError status=401');
  });

  it('Prisma 오류는 이름과 code(P 와 숫자 넷)만', () => {
    expect(describeError(prismaLike('P2002'))).toBe('PrismaClientKnownRequestError code=P2002');
    // Prisma code 꼴이 아니면 이름만 — code 칸에 글이 와도 남기지 않는다
    expect(describeError(prismaLike('저는 지은이고'))).toBe('PrismaClientKnownRequestError');
  });

  it('다른 Error 는 이름만, Error 가 아니면 typeof 만', () => {
    expect(describeError(new Error('quota exceeded 퇴근하고 걸어요'))).toBe('Error');
    expect(describeError(new TypeError('fetch failed'))).toBe('TypeError');
    expect(describeError(undefined)).toBe('undefined');
    expect(describeError('저는 지은이에요')).toBe('string');
    expect(describeError({ code: 'P2002', message: '저는 지은이에요' })).toBe('object');
  });

  it('이름이 식별자 모양이 아니면(글) Error 로 쓴다', () => {
    expect(describeError(Object.assign(new Error('x'), { name: '저는 지은이고 010-1234-5678' }))).toBe('Error');
  });

  it('어떤 경우에도 메시지·값은 나오지 않는다', () => {
    const described = [
      new LlmError('응답 본문: sk-SENTINEL', { status: 401, code: 'invalid_api_key' }),
      prismaLike('P2002'),
      new Error('저는 지은이고 010-1234-5678'),
    ].map(describeError);
    for (const secret of ['SENTINEL', '지은', '010', 'Unique constraint', '응답 본문']) expect(described.join('\n')).not.toContain(secret);
  });
});
