import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from '@prologue/shared';

/**
 * OpenAI GPT-5.6 Luna 구현체 (CLAUDE.md 13장)
 * - 여기에 오는 텍스트는 이미 가명처리돼 있어야 한다 (CLAUDE.md 10.2c). 사용자 ID 는 보내지 않는다
 * - 프롬프트 캐시는 OpenAI 가 같은 앞부분(1024 토큰 이상)에 자동으로 건다 — 고정 시스템 프롬프트를 맨 앞에 둔다
 * - 실패 메시지에 요청 내용을 담지 않는다 (CLAUDE.md 10.3)
 */
export class OpenAiLlmService implements LlmProvider {
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      max_completion_tokens: request.maxOutputTokens ?? 800,
    };
    if (request.responseFormat === 'json') body.response_format = { type: 'json_object' };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      throw new Error(`LLM 호출 실패 (${response.status}): ${detail}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    };
    return {
      content: json.choices?.[0]?.message?.content ?? '',
      inputTokens: json.usage?.prompt_tokens ?? 0,
      cachedInputTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  }
}
