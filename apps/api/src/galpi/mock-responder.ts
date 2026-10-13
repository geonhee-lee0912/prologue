import type { LlmCompletionRequest } from '@prologue/shared';
import { MISSING_PRACTICAL_LABEL } from './prompt/reply-prompt';
import { truncateCodePoints } from './text';

/**
 * 로컬 mock LLM 응답 — LLM_PROVIDER=mock 에서 갈피 대화가 첫 리포트까지 끝까지 돌게 한다 (Task 4 `respond`).
 * 진짜 갈피가 아니다. 앱 연결·화면 확인용이고, 운영에서는 mock 자체가 막힌다 (llm-provider.factory.ts)
 */
export function galpiMockRespond(request: LlmCompletionRequest): string {
  switch (request.purpose) {
    case 'reply':
      return mockReply(request);
    case 'proactive':
      return replyJson({ text: '{name}, 오늘 하루는 어땠어요?', expression: 'wave' }, null, false);
    case 'ingest':
      return mockIngest(request);
    case 'report':
      return MOCK_REPORT;
    case 'eval':
      return replyJson({ text: '(mock 평가 응답)', expression: 'thinking' }, null, false);
  }
}

const LINES = [
  { text: '오, 좋다. 그럴 때 기분은 어때요?', expression: 'curious' },
  { text: '그렇구나. 친구들은 어떤 사람이라고 해요?', expression: 'thinking' },
  { text: '아 맞다, 연락은 자주 하는 쪽이에요?', expression: 'curious' },
  { text: '좋다. 최근에 웃었던 일 하나만 들려줄래요?', expression: 'welcome' },
];

const PRACTICAL_QUESTIONS: Record<string, string> = {
  smoking: '아 맞다, 담배는 피워요?',
  marriage_intent: '결혼 생각은 있어요?',
  children_intent: '아이는 원해요?',
};

/** 알게 됨에 필요한 보이는 세 장을 돌아가며 채운다 */
const MOCK_PAGES = ['now', 'people', 'relationship'] as const;

const MOCK_REPORT = [
  '{name}, 들려준 이야기를 천천히 읽었어요.',
  '이 편지는 로컬 mock 이 쓴 자리 채움이에요. 진짜 리포트는 LLM 이 서고를 읽고 써요.',
  '화면에서 문단과 서명이 어떻게 보이는지 확인할 때 써 주세요.',
].join('\n');

function replyJson(bubble: { text: string; expression: string }, quickReply: { type: string; fact: string } | null, userUsedCasual: boolean): string {
  return JSON.stringify({ messages: [bubble], quickReply, signals: { userUsedCasual, crisis: 'none' } });
}

function mockReply(request: LlmCompletionRequest): string {
  const userLines = request.messages.filter((m) => m.role === 'user');
  const last = userLines[userLines.length - 1]?.content.trim() ?? '';
  // "~요"로 끝나지 않는 한글 문장이면 반말로 본다 — 말 놓기 흐름을 확인할 수 있게
  const userUsedCasual = /[가-힣]$/.test(last) && !last.endsWith('요');
  const prefix = `[${MISSING_PRACTICAL_LABEL}] `;
  const missingLine = request.messages
    .filter((m) => m.role === 'system')
    .flatMap((m) => m.content.split('\n'))
    .find((line) => line.startsWith(prefix));
  const missing = missingLine ? missingLine.slice(prefix.length).split(', ') : [];
  const fact = missing.find((f) => PRACTICAL_QUESTIONS[f]);
  if (userLines.length >= 3 && fact) {
    return replyJson({ text: PRACTICAL_QUESTIONS[fact], expression: 'curious' }, { type: 'practical', fact }, userUsedCasual);
  }
  return replyJson(LINES[userLines.length % LINES.length], null, userUsedCasual);
}

function mockIngest(request: LlmCompletionRequest): string {
  const body = request.messages.find((m) => m.role === 'user')?.content ?? '';
  const batch = body.split('[새 대화]\n')[1] ?? '';
  const claims = batch
    .split('\n')
    .map((line) => line.match(/^\[([^\]]+)\] 나: (.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    // 글자(코드 포인트)로 자른다 — UTF-16 칸으로 자르면 이모지를 반으로 갈라 저장할 수 없는 문장이 된다
    .map((match, i) => ({ op: 'add', page: MOCK_PAGES[i % MOCK_PAGES.length], text: truncateCodePoints(match[2], 60), sources: [match[1]] }));
  return JSON.stringify({ claims, facts: [] });
}
