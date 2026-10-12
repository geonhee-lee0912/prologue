import type { LlmMessage } from '@prologue/shared';
import { buildReplyMessages, type ReplyPromptInput } from './reply-prompt';

/** 먼저 말 걸기 — 대화와 같은 앞부분(캐시)을 그대로 쓰고, 끝에 지시를 붙인다 (AI 엔진 문서 7장) */
export const PROACTIVE_INSTRUCTION = [
  '[먼저 말 걸기] 사용자가 한동안 말이 없다. 갈피가 먼저 짧게 말을 건다.',
  '- 소재는 [서고]의 "다음에 꺼낼 것"에서 먼저 고르고, 없으면 [빈칸] 쪽의 가벼운 이야기로 건다.',
  '- 말풍선 하나, 질문 하나로 끝낸다. 버튼은 건네지 않는다(quickReply 는 null).',
  '- 답이 없었던 지난 말과 같은 것을 다시 묻지 않는다.',
  '- 기다렸다, 왜 안 오냐, 서운하다는 말을 하지 않는다. 답을 재촉하지 않는다.',
  '- 잠금화면에 보일 수 있다. 소개·다른 사람 이야기와 민감한 이야기는 꺼내지 않는다.',
  '- JSON 객체 하나로만 답한다.',
].join('\n');

export function buildProactiveMessages(input: ReplyPromptInput): LlmMessage[] {
  return [...buildReplyMessages(input), { role: 'system', content: PROACTIVE_INSTRUCTION }];
}
