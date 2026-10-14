/**
 * LLM 호출 — 갈피의 말, 서고 수집, 리포트, 먼저 말 걸기
 *
 * 실제 구현체: OpenAI GPT-5.6 Luna (apps/api/src/infra/openai-llm.service.ts). 테스트와 로컬은 MockLlmProvider.
 * 규칙 (CLAUDE.md 13장): 보내는 텍스트는 가명처리한다. 고정 프롬프트를 앞에 두어 캐시가 걸리게 한다.
 */
export const LLM_PROVIDER = 'LLM_PROVIDER';

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export type LlmPurpose = 'reply' | 'ingest' | 'report' | 'proactive' | 'eval';

export interface LlmCompletionRequest {
  purpose: LlmPurpose;
  /** 사용량 기록용. 프롬프트에는 넣지 않는다 */
  userId?: string;
  messages: LlmMessage[];
  maxOutputTokens?: number;
  /** json 이면 JSON 객체 하나만 돌려받는다. 프롬프트에 "JSON" 이라는 말이 있어야 한다(OpenAI 규칙) */
  responseFormat?: 'text' | 'json';
}

export interface LlmCompletionResult {
  content: string;
  inputTokens: number;
  /** 캐시에서 읽은 입력 토큰 — 원가가 1/10 이다 (컨셉 6.2) */
  cachedInputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

/** LlmError.code 로 받는 값 — 제공자 오류의 code·type 같은 식별자(invalid_api_key, rate_limit_exceeded …)만 */
const LLM_ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * LLM 호출 실패 — 로그에서 원인을 가를 칸만 담는다 (CLAUDE.md 10.3).
 * - status: HTTP 상태(401·429·500 …), code: 제공자 오류의 code 또는 type, timeout: 시간 초과로 끊었는지
 * - message 에는 응답 본문을 넣지 않는다 — OpenAI 오류 본문에는 가린 키 조각 같은 글이 담길 수 있다
 * - code 는 식별자 모양일 때만 담는다. 글이 오면 버린다
 */
export class LlmError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly timeout: boolean;

  constructor(message: string, details: { status?: number; code?: string | null; timeout?: boolean } = {}) {
    super(message);
    this.name = 'LlmError';
    this.status = details.status;
    this.code = LlmError.isCode(details.code) ? details.code : undefined;
    this.timeout = details.timeout === true;
  }

  /** 오류 code 로 담을 수 있는 값인가 — 식별자 모양의 짧은 글만 */
  static isCode(value: unknown): value is string {
    return typeof value === 'string' && LLM_ERROR_CODE.test(value);
  }
}

export interface MockLlmOptions {
  /** 차례로 돌려줄 응답 */
  responses?: string[];
  /** 큐가 비었을 때 요청을 보고 응답을 만든다 */
  respond?: (request: LlmCompletionRequest) => string;
}

/** 테스트·로컬 개발용 */
export class MockLlmProvider implements LlmProvider {
  readonly calls: LlmCompletionRequest[] = [];
  private readonly queue: string[];
  private readonly respond?: (request: LlmCompletionRequest) => string;

  constructor(options: MockLlmOptions = {}) {
    this.queue = [...(options.responses ?? [])];
    this.respond = options.respond;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    this.calls.push(request);
    const content = this.queue.shift() ?? this.respond?.(request) ?? '(mock 응답)';
    return {
      content,
      inputTokens: request.messages.reduce((n, m) => n + m.content.length, 0),
      cachedInputTokens: 0,
      outputTokens: content.length,
    };
  }
}
