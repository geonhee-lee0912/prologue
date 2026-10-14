import { LlmError } from '@prologue/shared';
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

  describe('실패 — 상태 코드와 오류 code 만 담은 LlmError, 응답 본문은 담지 않는다 (CLAUDE.md 10.3)', () => {
    const failWith = (status: number, body: string) => fetchMock.mockResolvedValue({ ok: false, status, text: async () => body });
    const fail = () => new OpenAiLlmService('test-key', 'gpt-5.6-luna').complete({ purpose: 'reply', messages: [] }).catch((e: unknown) => e);
    const openAiError = (error: Record<string, unknown>) => JSON.stringify({ error: { message: 'Incorrect API key provided: sk-SENTINEL***abcd', param: null, ...error } });

    it('상태 코드와 OpenAI 오류의 code 를 담고, 메시지에는 본문을 담지 않는다', async () => {
      failWith(401, openAiError({ type: 'invalid_request_error', code: 'invalid_api_key' }));
      const error = await fail();
      expect(error).toBeInstanceOf(LlmError);
      expect(error).toMatchObject({ name: 'LlmError', status: 401, code: 'invalid_api_key', timeout: false });
      expect((error as Error).message).toBe('LLM 호출 실패 (401)');
      // 본문의 어떤 글도 오류에 남지 않는다 — 메시지에도, 칸에도
      expect(JSON.stringify({ ...(error as object), message: (error as Error).message })).not.toMatch(/SENTINEL|Incorrect|sk-/);
    });

    it('code 가 없으면 type 을 쓴다', async () => {
      failWith(500, openAiError({ type: 'server_error', code: null }));
      expect(await fail()).toMatchObject({ status: 500, code: 'server_error', timeout: false });
    });

    it('code·type 이 식별자 모양이 아니면(글) 담지 않는다', async () => {
      failWith(429, openAiError({ type: 'quota exceeded for sk-SENTINEL', code: 'Rate limit reached for org-SENTINEL' }));
      const error = await fail();
      expect(error).toMatchObject({ status: 429, code: undefined });
      expect(JSON.stringify({ ...(error as object), message: (error as Error).message })).not.toContain('SENTINEL');
    });

    it('본문이 JSON 이 아니면 상태 코드만 담는다', async () => {
      failWith(502, 'x'.repeat(500));
      const error = await fail();
      expect(error).toMatchObject({ status: 502, code: undefined, timeout: false });
      expect((error as Error).message).toBe('LLM 호출 실패 (502)');
    });
  });

  describe('시간 제한', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    type FetchInit = { signal?: AbortSignal };

    /** 중단 신호가 울릴 때만 끝나는 약속 — 진짜 fetch 처럼 신호의 사유로 거절한다 */
    const neverUnlessAborted = (init: FetchInit) =>
      new Promise<never>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });

    it('기본은 30초이고 세 번째 인자로 바꿀 수 있다', async () => {
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      fetchMock.mockResolvedValue(ok({ choices: [{ message: { content: '응' } }], usage: {} }));

      await new OpenAiLlmService('test-key', 'gpt-5.6-luna').complete({ purpose: 'reply', messages: [] });
      expect(timeout).toHaveBeenLastCalledWith(30_000);
      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);

      await new OpenAiLlmService('test-key', 'gpt-5.6-luna', 5_000).complete({ purpose: 'reply', messages: [] });
      expect(timeout).toHaveBeenLastCalledWith(5_000);
    });

    it('응답이 오지 않으면 시간 초과로 거절한다 — 요청 내용은 메시지에 담지 않는다', async () => {
      fetchMock.mockImplementation((_url: string, init: FetchInit) => neverUnlessAborted(init));
      const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna', 20);
      const error = await llm
        .complete({ purpose: 'reply', userId: 'u1', messages: [{ role: 'user', content: '남에게 말 못 할 이야기' }] })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(LlmError);
      expect(error).toMatchObject({ timeout: true, status: undefined, code: undefined });
      expect((error as Error).message).toBe('LLM 호출 시간 초과 (20ms)');
    });

    it('헤더는 왔는데 본문이 오지 않아도 시간 초과로 거절한다', async () => {
      fetchMock.mockImplementation(async (_url: string, init: FetchInit) => ({ ok: true, json: () => neverUnlessAborted(init) }));
      const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna', 20);
      const error = await llm.complete({ purpose: 'reply', messages: [] }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(LlmError);
      expect(error).toMatchObject({ timeout: true });
      expect((error as Error).message).toBe('LLM 호출 시간 초과 (20ms)');
    });

    it('시간 초과가 아닌 실패는 시간 초과로 바꾸지 않고 그대로 던진다', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const llm = new OpenAiLlmService('test-key', 'gpt-5.6-luna');
      const error = await llm.complete({ purpose: 'reply', messages: [] }).catch((e: unknown) => e);
      expect((error as Error).message).toBe('fetch failed');
    });
  });
});
