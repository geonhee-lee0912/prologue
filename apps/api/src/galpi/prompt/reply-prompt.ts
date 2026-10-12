import {
  type ConditionFact,
  type LlmMessage,
  type PracticalFact,
  WIKI_PAGE_TITLES,
  WIKI_PAGES,
  type WikiPageKey,
} from '@prologue/shared';
import { GALPI_SYSTEM_PROMPT } from './system-prompt';

export const MISSING_PRACTICAL_LABEL = '아직 모르는 실용 정보';
export const ASKABLE_CONDITION_LABEL = '편지 허락을 물을 수 있는 조건 정보';

export interface HistoryLine {
  sender: 'galpi' | 'user';
  text: string;
}

export interface ReplyPromptInput {
  speechLevel: 'mixed' | 'casual';
  /** "소개할 만큼 알게 됨" — 아니면 알아가는 중 */
  known: boolean;
  /** 장별 문장. AI 만 보는 장도 갈피에게는 보인다 */
  pages: Record<WikiPageKey, string[]>;
  /** 빈칸인 보이는 장 */
  gaps: WikiPageKey[];
  missingPractical: PracticalFact[];
  /** 값은 아는데 편지 허락을 아직 묻지 않은 조건 정보 */
  askableConditions: ConditionFact[];
  flags: { sensitiveJustNow: boolean; skipped: boolean };
  /** 가명처리를 마친 최근 대화 (오래된 것부터) */
  history: HistoryLine[];
}

/** [고정 system — 캐시] + [사용자별 system] + [대화 기록] */
export function buildReplyMessages(input: ReplyPromptInput): LlmMessage[] {
  return [
    { role: 'system', content: GALPI_SYSTEM_PROMPT },
    { role: 'system', content: buildContext(input) },
    ...input.history.map((line): LlmMessage => ({ role: line.sender === 'galpi' ? 'assistant' : 'user', content: line.text })),
  ];
}

export function buildContext(input: ReplyPromptInput): string {
  const lines: string[] = [];
  lines.push(
    input.speechLevel === 'casual'
      ? '[말투] 말을 놓았다. 질문까지 전부 반말로 한다("요즘도 걸어?").'
      : '[말투] 반존대. 맞장구는 반말, 질문과 부탁은 존댓말.',
  );
  lines.push(
    input.known
      ? '[지금] 이 사람을 소개할 만큼 알게 됐다. 매일 대화 — 기억 하나를 꺼내고 질문 하나로 끝낸다.'
      : '[지금] 아직 알아가는 중이다. 빈칸인 장 쪽으로 자연스럽게 화제를 돌린다.',
  );
  lines.push('[서고]');
  for (const page of WIKI_PAGES) {
    const claims = input.pages[page];
    lines.push(`- ${WIKI_PAGE_TITLES[page]}: ${claims.length ? claims.join(' / ') : '(비어 있음)'}`);
  }
  if (input.gaps.length) lines.push(`[빈칸] ${input.gaps.map((p) => WIKI_PAGE_TITLES[p]).join(', ')}`);
  if (input.missingPractical.length) lines.push(`[${MISSING_PRACTICAL_LABEL}] ${input.missingPractical.join(', ')}`);
  if (input.askableConditions.length) lines.push(`[${ASKABLE_CONDITION_LABEL}] ${input.askableConditions.join(', ')}`);
  if (input.flags.sensitiveJustNow) {
    lines.push('[주의] 방금 민감한 이야기가 나왔다. 들어 주고, 편지에 담지 않는다고 알리고, 이번에는 질문하지 않는다. 이모지를 쓰지 않는다.');
  }
  if (input.flags.skipped) lines.push('[주의] 사용자가 "다른 얘기 할래요"를 눌렀다. 이유를 묻지 말고 다른 화제로 간다.');
  lines.push('[형식] JSON 객체 하나로만 답한다.');
  return lines.join('\n');
}
