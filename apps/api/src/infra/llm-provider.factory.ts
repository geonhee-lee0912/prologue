import { type LlmCompletionRequest, MockLlmProvider } from '@prologue/shared';
import { OpenAiLlmService } from './openai-llm.service';
import { RecordingLlmProvider, type UsageWriter } from './recording-llm.provider';

export type EnvGetter = (key: string) => string | undefined;

export interface LlmFactoryOptions {
  /** mock 일 때 응답을 만드는 함수 — 로컬에서 대화가 끝까지 돌게 한다 (galpi/mock-responder.ts) */
  mockRespond?: (request: LlmCompletionRequest) => string;
}

/**
 * LLM 진짜/mock 스위치 (CLAUDE.md 11장, BACKLOG 9절)
 * - LLM_PROVIDER=mock(기본) | openai
 * - 운영(NODE_ENV=production)에서는 mock 으로 시작하지 않는다
 */
export function createLlmProvider(get: EnvGetter, usage: UsageWriter, options: LlmFactoryOptions = {}): RecordingLlmProvider {
  const kind = get('LLM_PROVIDER') || 'mock';
  if (kind === 'mock') {
    if (get('NODE_ENV') === 'production') {
      throw new Error('운영에서는 LLM mock 을 쓸 수 없습니다. LLM_PROVIDER=openai 로 설정하세요.');
    }
    return new RecordingLlmProvider(new MockLlmProvider({ respond: options.mockRespond }), usage);
  }
  if (kind === 'openai') {
    const apiKey = get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('LLM_PROVIDER=openai 인데 OPENAI_API_KEY 가 없습니다.');
    return new RecordingLlmProvider(new OpenAiLlmService(apiKey, get('LLM_MODEL') || 'gpt-5.6-luna'), usage);
  }
  throw new Error(`알 수 없는 LLM_PROVIDER: ${kind}`);
}
