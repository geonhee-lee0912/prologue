import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../mock/scenarios';
import {
  answerLetter,
  answerLightIntro,
  beginSession,
  type Ctx,
  endConnection,
  openGalpiChat,
  pickTasteCard,
  sendToGalpi,
  sendToPerson,
  simulateMutualAccept,
  startFirstRun,
  windUp,
} from './actions';
import { emptyState, profile } from './fixtures';
import { INTERVIEW_QUESTIONS } from './galpi-script';
import { collectHomeEvents, selectHome } from './home';
import { createLetter } from './letters';
import { addDays } from './time';
import type { AppState, GalpiMessage } from './types';

let n = 0;
const ctx = (now = new Date(2026, 9, 11, 9, 0)): Ctx => ({ now, newId: () => `id-${(n += 1)}` });
const lastText = (s: AppState) => {
  const last = s.galpiMessages[s.galpiMessages.length - 1] as GalpiMessage;
  return last.kind === 'text' ? last.text : null;
};
const withLetter = (): AppState => ({
  ...emptyState(),
  letters: [
    createLetter({
      id: 'L1',
      sentAt: new Date(2026, 9, 10, 10, 0),
      candidates: [{ id: 'a', storyLine: '주말마다 동네 빵집을 찾아다니는 분' }],
      profiles: { a: profile('민준') },
    }),
  ],
});

describe('첫 만남', () => {
  it('인사는 한 번만', () => {
    const s0: AppState = { ...emptyState(), firstRunDone: false, interview: { step: 0, completed: false } };
    const s1 = startFirstRun(s0, ctx());
    expect(s1.firstRunDone).toBe(true);
    expect(lastText(s1)).toBe(INTERVIEW_QUESTIONS[0]);
    expect(startFirstRun(s1, ctx())).toBe(s1);
  });
});

describe('갈피에게 말하기', () => {
  it('빈 말은 보내지 않는다', () => {
    const s = emptyState();
    expect(sendToGalpi(s, '   ', ctx())).toBe(s);
  });

  it('인터뷰가 한 단계 나아가고 다음 질문이 온다', () => {
    const s = sendToGalpi({ ...emptyState(), interview: { step: 0, completed: false } }, ' 산책해요 ', ctx());
    expect(s.interview.step).toBe(1);
    expect(s.galpiMessages[0]).toMatchObject({ kind: 'text', from: 'me', text: '산책해요' });
    expect(lastText(s)).toBe(INTERVIEW_QUESTIONS[1]);
  });

  it('네 번째 답에서 첫 장이 꽂힌다', () => {
    const s = sendToGalpi({ ...emptyState(), interview: { step: 3, completed: false } }, '친구랑 웃었어요', ctx());
    expect(s.chapters.map((c) => c.title)).toEqual(['첫 장 — 요즘의 나']);
  });
});

describe('갈피 대화방을 열 때 — 친구 탭과 같은 순위가 첫 말을 정한다', () => {
  const now = new Date(2026, 9, 11, 9, 0);
  const day = (n: number) => ctx(addDays(now, n));
  const MEETING_QUESTION = '만남은 어땠어요? 좋았던 것도, 아니었던 것도 다 괜찮아요.';
  const MEETING_THANKS = '들려줘서 고마워요. 이 이야기는 다음 편지를 고를 때 꼭 참고할게요.';

  it('만남 다음 날이면 만남 이야기를 한 번 묻고, 들은 말은 만남 이야기로 받는다', () => {
    const s0 = SCENARIOS.meetingAndLetter(now);
    const s1 = openGalpiChat(s0, day(0));
    expect(s1.galpiMessages).toHaveLength(s0.galpiMessages.length + 1);
    expect(lastText(s1)).toBe(MEETING_QUESTION);
    expect(s1.askingMeetingFeedback).toBe('c1');
    expect(s1.meetings[0].askedAt).toBe(now.toISOString());
    expect(openGalpiChat(s1, day(0))).toBe(s1);
    expect(collectHomeEvents(s1, now).map((e) => e.kind)).not.toContain('meetingNextDay');
    expect(selectHome(s1, now).primary.kind).toBe('letterArrived');

    const s2 = sendToGalpi(s1, '대화가 잘 통했어요', day(0));
    expect(s2.meetings[0].feedbackGiven).toBe(true);
    expect(s2.askingMeetingFeedback).toBeNull();
    expect(lastText(s2)).toBe(MEETING_THANKS);
    expect(s2.keepsakes.map((k) => k.kind)).toContain('firstMeeting');
    expect(s2.interview).toEqual(s1.interview);
  });

  it('물어본 만남에 답이 없으면 이튿날 다시 묻지 않고, 친구 탭에도 다시 나오지 않는다', () => {
    const asked = openGalpiChat(SCENARIOS.meetingAndLetter(now), day(0));
    expect(openGalpiChat(asked, day(1))).toBe(asked);
    expect(collectHomeEvents(asked, addDays(now, 1)).map((e) => e.kind)).not.toContain('meetingNextDay');
  });

  it('만남 사흘째에는 물어본 표시를 지우고, 새 말은 평소처럼 받는다', () => {
    const asked = openGalpiChat(SCENARIOS.meetingAndLetter(now), day(0));
    const opened = openGalpiChat(asked, day(2));
    expect(opened.askingMeetingFeedback).toBeNull();
    expect(opened.galpiMessages).toBe(asked.galpiMessages);

    const replied = sendToGalpi(asked, '그냥 그랬어요', day(2));
    expect(replied.askingMeetingFeedback).toBeNull();
    expect(replied.galpiMessages).toHaveLength(asked.galpiMessages.length + 2);
    expect(lastText(replied)).not.toBe(MEETING_THANKS);
    expect(replied.meetings[0].feedbackGiven).toBe(false);
    expect(replied.keepsakes.map((k) => k.kind)).not.toContain('firstMeeting');
  });

  it('편지 고민 중이면 그 말을 한 번 건네고, 같은 날 다시 열면 건네지 않는다', () => {
    const s0 = SCENARIOS.considering(now);
    const s1 = openGalpiChat(s0, day(0));
    expect(s1.galpiMessages).toHaveLength(s0.galpiMessages.length + 1);
    expect(lastText(s1)).toBe('편지를 쓸지 고민 중인 분이 있어요. 지은 님처럼 걷는 걸 좋아하는 분이에요.');
    expect(openGalpiChat(s1, ctx(new Date(2026, 9, 11, 21, 0)))).toBe(s1);
    expect(openGalpiChat(s1, day(1)).galpiOpeners).toEqual({ date: '2026-10-12', count: 1 });
  });

  it('오랜만에 오면 반가운 말을 건넨다', () => {
    const s0: AppState = { ...emptyState(), previousVisitAt: addDays(now, -4).toISOString() };
    expect(lastText(openGalpiChat(s0, day(0)))).toBe('지은 님! 반가워요 ☕');
  });

  it('더 높은 순위의 일이 있으면 낮은 순위의 말을 먼저 건네지 않는다', () => {
    const s0: AppState = { ...SCENARIOS.letterOne(now), considering: { hint: '걷는 걸 좋아하는 분이에요.' } };
    expect(openGalpiChat(s0, day(0))).toBe(s0);
  });

  it.each(['waiting', 'interviewMidway', 'letterOne', 'connected'] as const)('%s 에서는 먼저 건넬 말이 없다', (key) => {
    const s0 = SCENARIOS[key](now);
    expect(openGalpiChat(s0, day(0))).toBe(s0);
  });

  it('첫 만남 전에는 아무것도 하지 않는다', () => {
    const s0 = SCENARIOS.firstRun(now);
    expect(openGalpiChat(s0, day(0))).toBe(s0);
  });
});

describe('편지에 답하기', () => {
  it('수락하면 상대 답을 기다리고, 첫 편지 기념품은 한 번만', () => {
    const s = answerLetter(withLetter(), 'L1', 'accept', ctx());
    expect(s.letters[0].status).toBe('acceptedWaiting');
    expect(s.keepsakes.filter((k) => k.kind === 'firstLetter')).toHaveLength(1);
  });

  it('넘기면 넘긴 편지 한 줄과 고맙다는 말, 이유는 서고에만', () => {
    const s = answerLetter(withLetter(), 'L1', 'pass', ctx(), '분위기가 달라요');
    expect(s.letters[0]).toMatchObject({ status: 'passed', passReason: '분위기가 달라요' });
    expect(s.galpiMessages.some((m) => m.kind === 'passedLetter')).toBe(true);
    expect(lastText(s)).toBe('말해 줘서 고마워요. 이 말은 서고에만 남아요.');
    expect(JSON.stringify(s.galpiMessages)).not.toContain('분위기가 달라요');
  });

  it('이미 답한 편지에는 다시 답할 수 없다', () => {
    const s1 = answerLetter(withLetter(), 'L1', 'pass', ctx());
    expect(answerLetter(s1, 'L1', 'accept', ctx())).toBe(s1);
  });

  it('상대도 수락하면 연결이 생기고 아직 축하 전이다', () => {
    const s1 = answerLetter(withLetter(), 'L1', 'accept', ctx());
    const s2 = simulateMutualAccept(s1, 'L1', ctx());
    expect(s2.connections[0]).toMatchObject({ name: '민준', letterId: 'L1', celebrated: false, ended: false });
    expect(s2.letters[0].status).toBe('connected');
    expect(s2.keepsakes.map((k) => k.kind)).toContain('firstConnection');
  });
});

describe('그 밖의 전이', () => {
  it('끝난 대화에는 보낼 수 없다', () => {
    const s1 = simulateMutualAccept(answerLetter(withLetter(), 'L1', 'accept', ctx()), 'L1', ctx());
    const id = s1.connections[0].id;
    const ended = endConnection(s1, id);
    expect(sendToPerson(ended, id, '안녕하세요', ctx()).connections[0].messages).toHaveLength(0);
  });

  it('취향 카드는 한 번만 고른다', () => {
    const s0: AppState = { ...emptyState(), tasteCards: [{ id: 't1', date: '2026-10-11', options: ['서점', '라면'], picked: null }] };
    const s1 = pickTasteCard(s0, 't1', 1);
    expect(pickTasteCard(s1, 't1', 0).tasteCards[0].picked).toBe(1);
  });

  it('가벼운 소개를 넘긴 한마디는 서고에만', () => {
    const s0: AppState = {
      ...emptyState(),
      lightIntros: [
        { id: 'li1', name: '현우', photoUri: null, age: 30, area: '합정', oneLine: '혼자 여행', status: 'new', expiresAt: '2026-10-12T00:00:00.000Z' },
      ],
    };
    const s1 = answerLightIntro(s0, 'li1', 'pass', ctx(), '분위기가 달라요');
    expect(s1.lightIntros[0]).toMatchObject({ status: 'passed', passReason: '분위기가 달라요' });
    expect(s1.galpiMessages).toHaveLength(0);
  });

  it('태엽은 쌓이기만 한다', () => {
    expect(windUp(windUp(emptyState())).windCount).toBe(2);
  });

  it('새로 열 때 지난 방문을 기억하고 기한 지난 편지를 닫는다', () => {
    const s0: AppState = { ...withLetter(), lastVisitAt: '2026-10-01T00:00:00.000Z' };
    const s1 = beginSession(s0, ctx(new Date(2026, 9, 20, 9, 0)));
    expect(s1.previousVisitAt).toBe('2026-10-01T00:00:00.000Z');
    expect(s1.letters[0].status).toBe('expired');
  });
});
