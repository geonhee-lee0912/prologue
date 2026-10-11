import { describe, expect, it } from 'vitest';
import { emptyState, profile } from './fixtures';
import { collectHomeEvents, isMeetingPending, selectHome } from './home';
import { createLetter } from './letters';
import type { AppState } from './types';

const now = new Date(2026, 9, 11, 9, 0); // 일요일 아침
const letter = () =>
  createLetter({
    id: 'L1',
    sentAt: new Date(2026, 9, 10, 10, 0),
    candidates: [{ id: 'a', storyLine: '주말마다 동네 빵집을 하나씩 찾아다니는 분' }],
    profiles: { a: profile('민준') },
  });
const meeting = (date: Date) => ({ connectionId: 'c1', date: date.toISOString(), feedbackGiven: false });
const connection = (celebrated: boolean) => ({
  id: 'c1',
  name: '민준',
  photoUri: null,
  letterId: 'L0',
  ended: false,
  celebrated,
  messages: [],
  lastReadAt: null,
});

describe('친구 탭 우선순위', () => {
  it('아무 일도 없으면 평소 한마디만, 카드는 없다', () => {
    const s = selectHome(emptyState(), now);
    expect(s.primary.kind).toBe('everyday');
    expect(s.primary.card).toBeNull();
    expect(s.secondary).toBeNull();
  });

  it('인터뷰를 다 하지 않았으면 이어하기 카드', () => {
    const st: AppState = { ...emptyState(), interview: { step: 5, completed: false } };
    const s = selectHome(st, now);
    expect(s.primary.kind).toBe('interviewResume');
    expect(s.primary.card?.title).toBe('이야기를 이어서 할까요?');
  });

  it('편지가 오면 편지 카드와 기한 표기', () => {
    const s = selectHome({ ...emptyState(), letters: [letter()] }, now);
    expect(s.primary.kind).toBe('letterArrived');
    expect(s.primary.card).toMatchObject({
      actionLabel: '읽기',
      href: '/letter/L1',
      subtitle: '10월 17일 토요일 오전 10시까지 열려 있어요',
    });
  });

  it('만남 다음 날이 편지보다 먼저, 편지는 작은 카드로 남는다', () => {
    const st: AppState = {
      ...emptyState(),
      letters: [letter()],
      meetings: [meeting(new Date(2026, 9, 10, 19, 0))],
    };
    const s = selectHome(st, now);
    expect(s.primary.kind).toBe('meetingNextDay');
    expect(s.primary.galpiLine).toBe('어제는 어땠어요?');
    expect(s.primary.meetingConnectionId).toBe('c1');
    expect(s.secondary?.kind).toBe('letterArrived');
  });

  it('만남 당일과 사흘 뒤에는 묻지 않는다', () => {
    const sameDay = { ...emptyState(), meetings: [meeting(new Date(2026, 9, 11, 7, 0))] };
    const later = { ...emptyState(), meetings: [meeting(new Date(2026, 9, 8, 19, 0))] };
    expect(selectHome(sameDay, now).primary.kind).toBe('everyday');
    expect(selectHome(later, now).primary.kind).toBe('everyday');
  });

  it('만남 이틀 뒤에는 "지난 만남"으로 묻는다', () => {
    const st = { ...emptyState(), meetings: [meeting(new Date(2026, 9, 9, 19, 0))] };
    expect(selectHome(st, now).primary.galpiLine).toBe('지난번 만남은 어땠어요?');
  });

  it('서로 수락은 가장 먼저, 한 번만', () => {
    const fresh = { ...emptyState(), letters: [letter()], connections: [connection(false)] };
    expect(selectHome(fresh, now).primary.kind).toBe('mutualAccept');
    expect(selectHome(fresh, now).primary.card?.href).toBe('/chat/c1');
    const seen = { ...emptyState(), connections: [connection(true)] };
    expect(selectHome(seen, now).primary.kind).toBe('everyday');
  });

  it('만료된 편지는 카드가 되지 않는다', () => {
    const l = letter();
    expect(selectHome({ ...emptyState(), letters: [l] }, new Date(l.expiresAt)).primary.kind).toBe(
      'everyday',
    );
  });

  it('편지 고민 중 신호는 카드 없이 갈피의 말로만', () => {
    const st = { ...emptyState(), considering: { hint: '지은 님처럼 걷는 걸 좋아하는 분이에요.' } };
    const s = selectHome(st, now);
    expect(s.primary.kind).toBe('letterConsidering');
    expect(s.primary.card).toBeNull();
  });

  it('오랜만에 오면 반가워할 뿐이다', () => {
    const st = { ...emptyState(), previousVisitAt: new Date(2026, 9, 7, 21, 0).toISOString() };
    const s = selectHome(st, now);
    expect(s.primary.kind).toBe('welcomeBack');
    expect(s.primary.galpiLine).toBe('지은 님! 반가워요 ☕');
  });

  it('갈피가 이미 물어본 만남은 다시 카드가 되지 않는다 — 답이 없어도 다시 묻지 않는다', () => {
    const asked = { ...meeting(new Date(2026, 9, 10, 19, 0)), askedAt: now.toISOString() };
    const st: AppState = { ...emptyState(), letters: [letter()], meetings: [asked] };
    expect(collectHomeEvents(st, now).map((e) => e.kind)).not.toContain('meetingNextDay');
    expect(selectHome(st, now).primary.kind).toBe('letterArrived');
  });
});

describe('만남 이야기를 기다리는 때', () => {
  const yesterday = meeting(new Date(2026, 9, 10, 19, 0));

  it('만남 다음 날과 이틀 뒤에만 기다린다', () => {
    expect(isMeetingPending(yesterday, new Date(2026, 9, 10, 23, 50))).toBe(false);
    expect(isMeetingPending(yesterday, new Date(2026, 9, 11, 0, 10))).toBe(true);
    expect(isMeetingPending(yesterday, new Date(2026, 9, 12, 23, 50))).toBe(true);
    expect(isMeetingPending(yesterday, new Date(2026, 9, 13, 0, 10))).toBe(false);
  });

  it('이미 들은 만남은 기다리지 않는다', () => {
    expect(isMeetingPending({ ...yesterday, feedbackGiven: true }, now)).toBe(false);
  });
});

describe('갈피의 말에는 금지 표현이 없다', () => {
  const banned = ['운명', '완벽', '보장', '100%', '놓치면', '지금 안 보면', '사라져요', '빨리', '기다리고 있어요', '왜 안'];
  const states: AppState[] = [
    emptyState(),
    { ...emptyState(), interview: { step: 0, completed: false } },
    { ...emptyState(), interview: { step: 5, completed: false } },
    { ...emptyState(), letters: [letter()] },
    { ...emptyState(), meetings: [meeting(new Date(2026, 9, 10, 19, 0))] },
    { ...emptyState(), connections: [connection(false)] },
    { ...emptyState(), considering: { hint: '걷는 걸 좋아하는 분이에요.' } },
    { ...emptyState(), previousVisitAt: new Date(2026, 9, 1).toISOString() },
  ];

  it.each(states.map((s, i) => [i, s] as const))('상태 %i', (_i, st) => {
    for (const e of collectHomeEvents(st, now)) {
      const text = [e.galpiLine, e.card?.title, e.card?.subtitle, e.card?.actionLabel].join(' ');
      for (const word of banned) expect(text).not.toContain(word);
    }
  });
});
