import { Logger } from '@nestjs/common';
import { MockLlmProvider } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { RecordingLlmProvider } from './recording-llm.provider';

describe('RecordingLlmProvider', () => {
  // 기록 실패 경고가 테스트 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
  let warn: MockInstance<Logger['warn']>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('호출마다 목적·사용자·토큰 수를 남기고 결과를 그대로 돌려준다', async () => {
    const create = vi.fn().mockResolvedValue({});
    const llm = new RecordingLlmProvider(new MockLlmProvider({ responses: ['안녕'] }), { llmUsage: { create } });
    const result = await llm.complete({ purpose: 'reply', userId: 'u1', messages: [{ role: 'user', content: '반가워' }] });

    expect(result.content).toBe('안녕');
    expect(create).toHaveBeenCalledWith({
      data: { userId: 'u1', purpose: 'reply', inputTokens: 3, cachedInputTokens: 0, outputTokens: 2 },
    });
  });

  it('사용자가 없는 호출은 userId 를 null 로 남긴다', async () => {
    const create = vi.fn().mockResolvedValue({});
    const llm = new RecordingLlmProvider(new MockLlmProvider(), { llmUsage: { create } });
    await llm.complete({ purpose: 'eval', messages: [] });
    expect(create.mock.calls[0][0].data.userId).toBeNull();
  });

  it('기록이 실패해도 대화는 이어진다', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const llm = new RecordingLlmProvider(new MockLlmProvider({ responses: ['ok'] }), { llmUsage: { create } });
    await expect(llm.complete({ purpose: 'reply', messages: [] })).resolves.toMatchObject({ content: 'ok' });
  });

  it('기록이 실패하면 목적만 경고로 남기고 대화 본문은 로그에 쓰지 않는다 (CLAUDE.md 10.3)', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const llm = new RecordingLlmProvider(new MockLlmProvider({ responses: ['갈피의 답'] }), { llmUsage: { create } });
    await llm.complete({ purpose: 'reply', userId: 'u1', messages: [{ role: 'user', content: '남에게 말 못 할 이야기' }] });

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('purpose=reply');
    expect(logged).not.toContain('남에게 말 못 할 이야기');
    expect(logged).not.toContain('갈피의 답');
  });

  it('기록 함수가 동기로 던져도 대화는 이어진다', async () => {
    const create = vi.fn().mockImplementation(() => {
      throw new Error('sync boom');
    });
    const llm = new RecordingLlmProvider(new MockLlmProvider({ responses: ['ok'] }), { llmUsage: { create } });
    await expect(llm.complete({ purpose: 'reply', messages: [] })).resolves.toMatchObject({ content: 'ok' });
  });
});
