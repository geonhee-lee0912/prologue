import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAiLlmService } from './openai-llm.service';

describe('OpenAiLlmService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ok = (body: unknown) => ({ ok: true, json: async () => body });

  it('Luna 모델로 보내고 응답과 토큰 수를 읽는다', async () => {
    fetchMock.mockResolvedValue(
      ok({
        choices: [{ message: { content: '반가워요' } }],
        usage: { prompt_tokens: 1200, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 1024 } },
      }),
    );
    const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna');
    const result = await llm.complete({ purpose: 'reply', userId: 'u1', messages: [{ role: 'user', content: '안녕' }] });

    expect(result).toEqual({ content: '반가워요', inputTokens: 1200, cachedInputTokens: 1024, outputTokens: 20 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('gpt-5.6-luna');
    expect(body.max_completion_tokens).toBe(800);
    expect(body.response_format).toBeUndefined();
    // 사용자 ID 는 OpenAI 로 보내지 않는다 (CLAUDE.md 10.2c)
    expect(JSON.stringify(body)).not.toContain('u1');
  });

  it('json 모드면 response_format 을 붙인다', async () => {
    fetchMock.mockResolvedValue(ok({ choices: [{ message: { content: '{}' } }], usage: {} }));
    const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna');
    await llm.complete({ purpose: 'ingest', messages: [], responseFormat: 'json', maxOutputTokens: 1200 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.max_completion_tokens).toBe(1200);
  });

  it('실패하면 상태 코드와 짧게 자른 사유만 담아 던진다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'x'.repeat(500) });
    const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna');
    const error = await llm.complete({ purpose: 'reply', messages: [] }).catch((e: Error) => e);
    expect((error as Error).message).toBe(`LLM 호출 실패 (429): ${'x'.repeat(200)}`);
  });
});
