import { Logger } from '@nestjs/common';
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider, LlmPurpose } from '@prologue/shared';

/** 사용량을 남길 곳 — InfraModule 이 PrismaService 를 감싸서 넣는다 */
export interface UsageWriter {
  llmUsage: {
    create(args: {
      data: {
        userId: string | null;
        purpose: LlmPurpose;
        inputTokens: number;
        cachedInputTokens: number;
        outputTokens: number;
      };
    }): Promise<unknown>;
  };
}

/** LLM 호출마다 토큰 수를 남긴다 — 1인 월 원가 감시 (스펙 8장, 컨셉 6.7). 기록이 실패해도 대화는 이어진다 */
export class RecordingLlmProvider implements LlmProvider {
  private readonly logger = new Logger('LlmUsage');

  constructor(
    readonly inner: LlmProvider,
    private readonly usage: UsageWriter,
  ) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const result = await this.inner.complete(request);
    try {
      await this.usage.llmUsage.create({
        data: {
          userId: request.userId ?? null,
          purpose: request.purpose,
          inputTokens: result.inputTokens,
          cachedInputTokens: result.cachedInputTokens,
          outputTokens: result.outputTokens,
        },
      });
    } catch {
      this.logger.warn(`usage record failed purpose=${request.purpose}`);
    }
    return result;
  }
}
