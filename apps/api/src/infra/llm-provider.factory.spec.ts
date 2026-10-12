import { MockLlmProvider } from '@prologue/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLlmProvider } from './llm-provider.factory';
import { OpenAiLlmService } from './openai-llm.service';

const usage = { llmUsage: { create: vi.fn().mockResolvedValue({}) } };
const env = (values: Record<string, string>) => (key: string) => values[key];

describe('LLM 진짜/mock 스위치', () => {
  it('설정이 없거나 비어 있으면 mock', () => {
    expect(createLlmProvider(env({}), usage).inner).toBeInstanceOf(MockLlmProvider);
    expect(createLlmProvider(env({ LLM_PROVIDER: '' }), usage).inner).toBeInstanceOf(MockLlmProvider);
  });

  it('mock 은 받은 응답 함수로 답한다', async () => {
    const llm = createLlmProvider(env({ LLM_PROVIDER: 'mock' }), usage, { mockRespond: () => 'mock 답' });
    expect((await llm.complete({ purpose: 'reply', messages: [] })).content).toBe('mock 답');
  });

  it('운영에서는 mock 으로 시작하지 않는다 (BACKLOG 9절)', () => {
    expect(() => createLlmProvider(env({ LLM_PROVIDER: 'mock', NODE_ENV: 'production' }), usage)).toThrow('운영에서는 LLM mock');
  });

  it('openai 는 키가 있어야 한다', () => {
    expect(() => createLlmProvider(env({ LLM_PROVIDER: 'openai' }), usage)).toThrow('OPENAI_API_KEY');
    expect(createLlmProvider(env({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'k' }), usage).inner).toBeInstanceOf(OpenAiLlmService);
  });

  it('모르는 값은 거부한다', () => {
    expect(() => createLlmProvider(env({ LLM_PROVIDER: 'claude' }), usage)).toThrow('알 수 없는 LLM_PROVIDER');
  });

  // 키는 Authorization 헤더 값이 된다. 줄바꿈·NUL 이 섞이면 fetch 가 키를 통째로 담은 오류를 던지므로, 시작할 때 걸러 낸다
  describe('OPENAI_API_KEY 점검', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const openai = (key: string) => env({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: key });
    const thrown = (fn: () => unknown): Error => {
      try {
        fn();
      } catch (error) {
        return error as Error;
      }
      throw new Error('던지지 않았다');
    };

    it.each([
      ['줄바꿈(LF)', 'sk-a\nb'],
      ['줄바꿈(CRLF)', 'sk-a\r\nb'],
      ['NUL', 'sk-a\u0000b'],
      ['안쪽 공백', 'sk-a b'],
      ['ASCII 가 아닌 글자', 'sk-a키b'],
    ])('키 안에 %s 가 섞이면 거부하고, 값은 메시지에 담지 않는다 (CLAUDE.md 10.3·10.4)', (_label, key) => {
      const error = thrown(() => createLlmProvider(openai(key), usage));
      expect(error.message).toBe('OPENAI_API_KEY 형식이 올바르지 않습니다.');
      expect(error.message).not.toContain('sk-a');
    });

    it('앞뒤 공백·줄바꿈은 다듬어 받고, 다듬은 키로 보낸다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '응' } }], usage: {} }) });
      vi.stubGlobal('fetch', fetchMock);

      const llm = createLlmProvider(openai('  sk-proj-Ab12_cd-34\r\n'), usage);
      expect(llm.inner).toBeInstanceOf(OpenAiLlmService);
      await llm.complete({ purpose: 'reply', messages: [] });

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-proj-Ab12_cd-34');
    });

    it('공백뿐인 키는 없는 것으로 본다', () => {
      expect(() => createLlmProvider(openai('  \n '), usage)).toThrow('OPENAI_API_KEY 가 없습니다');
    });
  });
});
