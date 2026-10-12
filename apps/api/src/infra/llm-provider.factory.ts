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
 * - OPENAI_API_KEY 는 앞뒤 공백을 다듬고 형식(눈에 보이는 ASCII 만)을 확인한다. 틀리면 값을 담지 않은 메시지로 시작을 막는다
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
    // 붙여 넣다 딸려 온 앞뒤 공백·줄바꿈은 다듬는다
    const apiKey = get('OPENAI_API_KEY')?.trim();
    if (!apiKey) throw new Error('LLM_PROVIDER=openai 인데 OPENAI_API_KEY 가 없습니다.');
    // 키는 Authorization 헤더 값이 된다. 줄바꿈·NUL·공백·한글이 섞이면 fetch 가 키를 통째로 담은 오류를 던지므로 여기서 막는다.
    // 오류 메시지에는 값을 한 글자도 담지 않는다 (CLAUDE.md 10.3·10.4)
    if (!/^[\x21-\x7e]+$/.test(apiKey)) throw new Error('OPENAI_API_KEY 형식이 올바르지 않습니다.');
    return new RecordingLlmProvider(new OpenAiLlmService(apiKey, get('LLM_MODEL') || 'gpt-5.6-luna'), usage);
  }
  throw new Error(`알 수 없는 LLM_PROVIDER: ${kind}`);
}
