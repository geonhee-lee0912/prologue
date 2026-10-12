import { FORBIDDEN_EXPRESSIONS, type WikiPageKey } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { GALPI_SYSTEM_PROMPT } from './system-prompt';
import { buildReplyMessages, type ReplyPromptInput } from './reply-prompt';

const emptyPages = (): Record<WikiPageKey, string[]> => ({
  now: [],
  people: [],
  relationship: [],
  met: [],
  attraction: [],
  next_topics: [],
});

const input = (over: Partial<ReplyPromptInput> = {}): ReplyPromptInput => ({
  speechLevel: 'mixed',
  known: false,
  pages: emptyPages(),
  gaps: ['now', 'people', 'relationship'],
  missingPractical: ['smoking', 'marriage_intent', 'children_intent'],
  askableConditions: [],
  flags: { sensitiveJustNow: false, skipped: false },
  history: [{ sender: 'user', text: '퇴근하고 걸어요' }],
  ...over,
});

describe('갈피 고정 시스템 프롬프트', () => {
  it('친구처럼 알아가기·반존대·서고 규칙·JSON 형식을 담는다', () => {
    for (const phrase of ['인터뷰가 아니다', '반존대', '서고에는 갈피만 들어간다', 'JSON', '{name}', '민감정보를 먼저 묻지 않는다']) {
      expect(GALPI_SYSTEM_PROMPT).toContain(phrase);
    }
  });

  it('금지 표현을 전부 담는다', () => {
    for (const word of FORBIDDEN_EXPRESSIONS) expect(GALPI_SYSTEM_PROMPT).toContain(word);
  });

  it('캐시가 걸릴 만큼 길다', () => {
    expect(GALPI_SYSTEM_PROMPT.length).toBeGreaterThan(2000);
  });
});

describe('사용자별 프롬프트', () => {
  it('맨 앞은 모든 사용자에게 같은 고정 프롬프트 — 캐시가 걸린다', () => {
    const a = buildReplyMessages(input());
    const b = buildReplyMessages(input({ speechLevel: 'casual', known: true }));
    expect(a[0]).toEqual({ role: 'system', content: GALPI_SYSTEM_PROMPT });
    expect(b[0].content).toBe(a[0].content);
    expect(a[1].role).toBe('system');
  });

  it('대화 기록은 갈피=assistant, 사용자=user 로 뒤에 붙는다', () => {
    const messages = buildReplyMessages(input({ history: [{ sender: 'galpi', text: '안녕하세요' }, { sender: 'user', text: '안녕' }] }));
    expect(messages.slice(2)).toEqual([
      { role: 'assistant', content: '안녕하세요' },
      { role: 'user', content: '안녕' },
    ]);
  });

  it('말을 놓았으면 전부 반말이라고 알린다', () => {
    expect(buildReplyMessages(input({ speechLevel: 'casual' }))[1].content).toContain('전부 반말');
    expect(buildReplyMessages(input())[1].content).toContain('반존대');
  });

  it('서고·빈칸·모르는 실용 정보·물을 수 있는 조건 정보를 적는다', () => {
    const pages = emptyPages();
    pages.now = ['퇴근 뒤에는 혼자 걷는다'];
    pages.next_topics = ['금요일에 발표가 있다'];
    const context = buildReplyMessages(input({ pages, gaps: ['people'], askableConditions: ['company'] }))[1].content;
    expect(context).toContain('요즘의 나: 퇴근 뒤에는 혼자 걷는다');
    expect(context).toContain('다음에 꺼낼 것: 금요일에 발표가 있다');
    expect(context).toContain('[빈칸] 사람들');
    expect(context).toContain('[아직 모르는 실용 정보] smoking, marriage_intent, children_intent');
    expect(context).toContain('[편지 허락을 물을 수 있는 조건 정보] company');
  });

  it('민감한 이야기 직후와 건너뛰기를 알린다', () => {
    const context = buildReplyMessages(input({ flags: { sensitiveJustNow: true, skipped: true } }))[1].content;
    expect(context).toContain('이번에는 질문하지 않는다');
    expect(context).toContain('이유를 묻지 말고');
  });
});
