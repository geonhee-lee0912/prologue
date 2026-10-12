import { describe, expect, it } from 'vitest';
import { MockLlmProvider } from './llm.provider';

describe('MockLlmProvider', () => {
  it('큐에 넣은 응답을 차례로 돌려준다', async () => {
    const llm = new MockLlmProvider({ responses: ['첫 번째', '두 번째'] });
    expect((await llm.complete({ purpose: 'reply', messages: [] })).content).toBe('첫 번째');
    expect((await llm.complete({ purpose: 'reply', messages: [] })).content).toBe('두 번째');
  });

  it('큐가 비면 respond 로 만든다', async () => {
    const llm = new MockLlmProvider({ respond: (req) => `목적:${req.purpose}` });
    expect((await llm.complete({ purpose: 'ingest', messages: [] })).content).toBe('목적:ingest');
  });

  it('둘 다 없으면 기본 응답', async () => {
    const llm = new MockLlmProvider();
    expect((await llm.complete({ purpose: 'reply', messages: [] })).content).toBe('(mock 응답)');
  });

  it('받은 요청을 기록하고 토큰 수를 돌려준다', async () => {
    const llm = new MockLlmProvider({ responses: ['ok'] });
    const result = await llm.complete({ purpose: 'reply', userId: 'u1', messages: [{ role: 'user', content: '안녕' }] });
    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].userId).toBe('u1');
    expect(result).toEqual({ content: 'ok', inputTokens: 2, cachedInputTokens: 0, outputTokens: 2 });
  });
});
