import { MockLlmProvider } from '@prologue/shared';
import { describe, expect, it, vi } from 'vitest';
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
});
