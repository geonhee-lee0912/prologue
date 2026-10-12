import type { WikiPageKey } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { buildProactiveMessages, PROACTIVE_INSTRUCTION } from '../prompt/proactive-prompt';
import { buildReplyMessages, type ReplyPromptInput } from '../prompt/reply-prompt';
import { findProactiveBanned, preferredHour, type ProactiveInput, shouldSendProactive } from './proactive';

/** 한국 시간 2026-10-(day) h시 m분 */
const kst = (h: number, m = 0, day = 12) => new Date(Date.UTC(2026, 9, day, h - 9, m));
const yesterdayMorning = kst(9, 0, 11);

const base = (over: Partial<ProactiveInput> = {}): ProactiveInput => ({
  now: kst(20),
  firstMeetingAt: kst(10, 0, 10),
  lastUserMessageAt: kst(9),
  lastProactiveAt: kst(20, 0, 11),
  unansweredProactive: 0,
  lastSafetyAt: null,
  preferredHour: 20,
  ...over,
});

describe('먼저 말 걸지 정하기 (스펙 7장)', () => {
  it('주로 대화하던 시각이 되면 건다', () => {
    expect(shouldSendProactive(base())).toBe(true);
  });

  it('한국 시간 밤 9시부터 아침 8시 전까지는 걸지 않는다 — 서버가 UTC 여도 (리뷰 3)', () => {
    // 한국 22:30 은 UTC 13:30 — UTC 로 보면 낮이다
    expect(shouldSendProactive(base({ now: kst(22, 30), preferredHour: 9, lastUserMessageAt: yesterdayMorning }))).toBe(false);
    expect(shouldSendProactive(base({ now: kst(7, 59), preferredHour: 7, lastUserMessageAt: yesterdayMorning }))).toBe(false);
    expect(shouldSendProactive(base({ now: kst(8), preferredHour: 8, lastUserMessageAt: yesterdayMorning }))).toBe(true);
  });

  it('하루 한 번 — 날짜는 한국 기준이다 (리뷰 3)', () => {
    // 한국 12일 08:30 = UTC 11일 23:30. UTC 로는 어제지만 한국으로는 오늘 이미 걸었다
    expect(shouldSendProactive(base({ lastProactiveAt: kst(8, 30) }))).toBe(false);
    expect(shouldSendProactive(base({ lastProactiveAt: kst(23, 0, 11) }))).toBe(true);
  });

  it('첫 만남을 한 날은 걸지 않는다 — 첫 만남이 그날 갈피가 먼저 건 말이다', () => {
    expect(shouldSendProactive(base({ firstMeetingAt: kst(10), lastProactiveAt: null, lastUserMessageAt: null }))).toBe(false);
  });

  it('첫 만남을 한 날도 한국 날짜로 본다 — UTC 로는 어제여도 오늘 만났으면 쉰다 (리뷰 3)', () => {
    // 한국 12일 07:30 = UTC 11일 22:30
    expect(shouldSendProactive(base({ firstMeetingAt: kst(7, 30), lastProactiveAt: null, lastUserMessageAt: null }))).toBe(false);
    // 한국 11일 23:30 = UTC 11일 14:30 — 어제 만났으니 오늘은 건다
    expect(shouldSendProactive(base({ firstMeetingAt: kst(23, 30, 11), lastProactiveAt: null, lastUserMessageAt: null }))).toBe(true);
  });

  it('답 없는 말이 두 번 이어지면 멈춘다', () => {
    expect(shouldSendProactive(base({ unansweredProactive: 1 }))).toBe(true);
    expect(shouldSendProactive(base({ unansweredProactive: 2 }))).toBe(false);
  });

  it('주로 대화하던 시각 전이면 아직 걸지 않는다', () => {
    expect(shouldSendProactive(base({ now: kst(19, 59) }))).toBe(false);
  });

  it('사용자가 6시간 안에 말했거나 안전 안내 뒤 24시간 안이면 쉰다', () => {
    expect(shouldSendProactive(base({ lastUserMessageAt: kst(15) }))).toBe(false);
    expect(shouldSendProactive(base({ lastSafetyAt: kst(21, 0, 11) }))).toBe(false);
    expect(shouldSendProactive(base({ lastSafetyAt: kst(19, 0, 11) }))).toBe(true);
  });

  it('6시간·24시간이 딱 지났으면 쉬지 않는다', () => {
    expect(shouldSendProactive(base({ lastUserMessageAt: kst(14) }))).toBe(true);
    expect(shouldSendProactive(base({ lastSafetyAt: kst(20, 0, 11) }))).toBe(true);
  });
});

describe('주로 대화하던 시각', () => {
  it('한국 시간으로 가장 자주 말한 시각이다', () => {
    expect(preferredHour([kst(12, 5), kst(12, 40), kst(19), kst(12, 10, 11)])).toBe(12);
  });

  it('조용한 시간에 한 말은 세지 않고, 기록이 없으면 저녁 8시다', () => {
    expect(preferredHour([kst(23), kst(23, 30), kst(1)])).toBe(20);
    expect(preferredHour([])).toBe(20);
  });

  it('조용한 시간의 경계 — 8시는 세고 7시 59분·21시는 세지 않는다. 20시대는 센다', () => {
    expect(preferredHour([kst(8), kst(7, 59), kst(7, 30), kst(21), kst(21, 30)])).toBe(8);
    // 20시대를 세지 않았다면 9시가 이긴다 — 기본 시각(20시)과 같은 값이라 세지 않아도 20이 나오는 경우를 가린다
    expect(preferredHour([kst(20, 59), kst(20, 30), kst(9)])).toBe(20);
  });

  it('같으면 이른 시각', () => {
    expect(preferredHour([kst(18), kst(10)])).toBe(10);
  });
});

describe('먼저 말 걸 때 쓰지 않는 말', () => {
  it('죄책감 문구와 소개팅이라는 말을 찾는다', () => {
    expect(findProactiveBanned('왜 안 와요? 기다렸어요')).toEqual(['왜 안 와', '기다렸']);
    expect(findProactiveBanned('소개팅 준비는 잘 돼요?')).toEqual(['소개팅']);
    expect(findProactiveBanned('{name}, 금요일 발표는 잘 끝났어요?')).toEqual([]);
  });
});

const emptyPages = (): Record<WikiPageKey, string[]> => ({ now: [], people: [], relationship: [], met: [], attraction: [], next_topics: [] });

const promptInput = (over: Partial<ReplyPromptInput> = {}): ReplyPromptInput => ({
  speechLevel: 'mixed',
  known: true,
  pages: { ...emptyPages(), next_topics: ['금요일에 발표가 있다'] },
  gaps: ['people'],
  missingPractical: [],
  askableConditions: [],
  flags: { sensitiveJustNow: false, skipped: false },
  history: [{ sender: 'user', text: '내일 발표라 떨려요' }],
  ...over,
});

describe('먼저 말 걸기 프롬프트', () => {
  it('JSON 이라는 말이 들어 있다 — JSON 모드는 프롬프트에 그 말이 없으면 요청을 거절한다 (mock 은 알아채지 못한다)', () => {
    const prompt = buildProactiveMessages(promptInput())
      .map((m) => m.content)
      .join('\n');
    expect(prompt).toContain('JSON');
    // 끝에 붙는 지시도 형식을 다시 일러 준다
    expect(PROACTIVE_INSTRUCTION).toContain('JSON');
  });

  it('대화와 같은 앞부분을 그대로 쓰고 끝에 지시 하나만 붙인다 — 프롬프트 캐시가 걸린다', () => {
    const input = promptInput();
    const proactive = buildProactiveMessages(input);
    expect(proactive.slice(0, -1)).toEqual(buildReplyMessages(input));
    expect(proactive[proactive.length - 1]).toEqual({ role: 'system', content: PROACTIVE_INSTRUCTION });
  });

  it('서고의 다음에 꺼낼 것 → 빈칸 순으로 소재를 고르고, 죄책감 문구·버튼을 막는다', () => {
    expect(PROACTIVE_INSTRUCTION).toContain('[먼저 말 걸기]');
    expect(PROACTIVE_INSTRUCTION).toContain('다음에 꺼낼 것');
    expect(PROACTIVE_INSTRUCTION).toContain('[빈칸]');
    expect(PROACTIVE_INSTRUCTION).toContain('quickReply 는 null');
    expect(PROACTIVE_INSTRUCTION).toContain('재촉하지 않는다');
  });
});
