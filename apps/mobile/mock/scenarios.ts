/**
 * 미리보기 시나리오 — 설정 탭의 개발용 패널에서 바꾼다.
 * 이름·문구는 모두 mock 이다.
 */
import { emptyState, profile } from '../domain/fixtures';
import { INTERVIEW_QUESTIONS } from '../domain/galpi-script';
import { createLetter } from '../domain/letters';
import { addDays, endOfLocalDay, localDateKey } from '../domain/time';
import type { AppState, Letter } from '../domain/types';

export type ScenarioKey =
  | 'firstRun'
  | 'waiting'
  | 'considering'
  | 'interviewMidway'
  | 'letterTwo'
  | 'letterOne'
  | 'meetingAndLetter'
  | 'connected';

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  firstRun: '첫 실행',
  waiting: '기다리는 중',
  considering: '편지 고민 중',
  interviewMidway: '인터뷰 중간',
  letterTwo: '편지 (두 분 중 고르기)',
  letterOne: '편지 (한 분)',
  meetingAndLetter: '만남 다음 날 + 편지',
  connected: '서로 수락',
};

const PROFILES = {
  a: profile('민준', {
    age: 31,
    area: '마포',
    practical: ['비흡연'],
    badges: ['재직 확인'],
    allowedConditions: ['연구원'],
    why: '주말마다 동네 빵집을 하나씩 찾아다니는 분이에요. 지은 님이 말한 "천천히 걷는 주말"을 이 분도 좋아해요.',
  }),
  b: profile('도윤', {
    age: 33,
    area: '성동',
    practical: ['비흡연', '결혼 생각 있음'],
    badges: ['재직 확인'],
    why: '퇴근 후 클라이밍을 하고, 말보다 듣는 게 편한 분이에요. 지은 님이 편하다고 한 "조용히 곁에 있는 사람"에 가까워요.',
  }),
};

const STORY = {
  a: { id: 'a', storyLine: '주말마다 동네 빵집을 하나씩 찾아다니는 분' },
  b: { id: 'b', storyLine: '퇴근 후 클라이밍을 하고, 듣는 게 편한 분' },
};

/** 인터뷰를 마치고 기다리는 보통의 상태 */
function settled(now: Date): AppState {
  const day = (n: number) => addDays(now, n).toISOString();
  return {
    ...emptyState(),
    interview: { step: 12, completed: true },
    chapters: [
      { id: 'ch1', title: '첫 장 — 요즘의 나', addedAt: day(-6) },
      { id: 'ch2', title: '두 번째 장 — 나를 둘러싼 사람들', addedAt: day(-5) },
      { id: 'ch3', title: '세 번째 장 — 내가 바라는 관계', addedAt: day(-5) },
    ],
    galpiMessages: [
      { id: 'g1', kind: 'text', from: 'galpi', text: '이야기 들려줘서 고마워요. 제가 읽은 당신을 편지로 써서 내 이야기 탭에 두었어요 ✉️', at: day(-5) },
      { id: 'g2', kind: 'text', from: 'galpi', text: '퇴근길 산책 얘기에 갈피가 끼워져 있어요. 요즘도 걸어요? 🌿', at: day(-1) },
      { id: 'g3', kind: 'text', from: 'me', text: '응 어제도 한강까지 걸었어', at: day(-1) },
      { id: 'g4', kind: 'text', from: 'galpi', text: '한강까지요? 꽤 먼 길인데. 걸을 때 주로 무슨 생각 해요?', at: day(-1) },
      { id: 'g5', kind: 'lightIntroInvite', from: 'galpi', at: now.toISOString() },
    ],
    galpiLastReadAt: day(-1),
    tasteCards: [
      { id: 'tc-today', date: localDateKey(now), options: ['비 오는 날 작은 서점', '새벽 한강 라면'], picked: null },
    ],
    lightIntros: [
      {
        id: 'li1',
        name: '현우',
        photoUri: null,
        age: 30,
        area: '합정',
        oneLine: '사진 찍으러 혼자 여행 다녀요',
        status: 'new',
        expiresAt: endOfLocalDay(now).toISOString(),
      },
      {
        id: 'li2',
        name: '서준',
        photoUri: null,
        age: 32,
        area: '연남',
        oneLine: '주말 아침마다 테니스를 쳐요',
        status: 'new',
        expiresAt: endOfLocalDay(now).toISOString(),
      },
    ],
    lastVisitAt: day(-1),
  };
}

function withLetter(base: AppState, letter: Letter, now: Date): AppState {
  const at = now.toISOString();
  return {
    ...base,
    letters: [...base.letters, letter],
    galpiMessages: [
      ...base.galpiMessages,
      { id: `g-${letter.id}-face`, kind: 'emoticon', from: 'galpi', expression: 'proud', at },
      { id: `g-${letter.id}`, kind: 'letter', from: 'galpi', letterId: letter.id, at },
    ],
  };
}

export const SCENARIOS: Record<ScenarioKey, (now: Date) => AppState> = {
  firstRun: () => ({ ...emptyState(), firstRunDone: false, interview: { step: 0, completed: false } }),

  waiting: (now) => settled(now),

  considering: (now) => ({ ...settled(now), considering: { hint: '지은 님처럼 걷는 걸 좋아하는 분이에요.' } }),

  interviewMidway: (now) => ({
    ...emptyState(),
    interview: { step: 5, completed: false },
    chapters: [{ id: 'ch1', title: '첫 장 — 요즘의 나', addedAt: addDays(now, -1).toISOString() }],
    galpiMessages: [
      { id: 'i1', kind: 'text', from: 'galpi', text: INTERVIEW_QUESTIONS[5], at: addDays(now, -1).toISOString() },
    ],
    galpiLastReadAt: addDays(now, -1).toISOString(),
  }),

  letterTwo: (now) =>
    withLetter(
      settled(now),
      createLetter({ id: 'L-two', sentAt: addDays(now, -1), candidates: [STORY.a, STORY.b], profiles: PROFILES }),
      now,
    ),

  letterOne: (now) =>
    withLetter(
      settled(now),
      createLetter({ id: 'L-one', sentAt: now, candidates: [STORY.b], profiles: { b: PROFILES.b } }),
      now,
    ),

  meetingAndLetter: (now) => {
    const base = settled(now);
    const firstLetter: Letter = {
      ...createLetter({ id: 'L-met', sentAt: addDays(now, -9), candidates: [STORY.a], profiles: { a: PROFILES.a } }),
      status: 'connected',
    };
    return withLetter(
      {
        ...base,
        letters: [firstLetter],
        connections: [
          {
            id: 'c1',
            name: '민준',
            photoUri: null,
            letterId: 'L-met',
            ended: false,
            celebrated: true,
            messages: [
              { id: 'p1', from: 'them', text: '어제 즐거웠어요. 조심히 들어가셨어요?', at: addDays(now, -1).toISOString() },
            ],
            lastReadAt: null,
          },
        ],
        meetings: [{ connectionId: 'c1', date: addDays(now, -1).toISOString(), feedbackGiven: false }],
      },
      createLetter({ id: 'L-next', sentAt: now, candidates: [STORY.b], profiles: { b: PROFILES.b } }),
      now,
    );
  },

  connected: (now) => {
    const base = settled(now);
    const letter: Letter = {
      ...createLetter({ id: 'L-con', sentAt: addDays(now, -2), candidates: [STORY.a], profiles: { a: PROFILES.a } }),
      status: 'connected',
    };
    return {
      ...base,
      letters: [letter],
      connections: [
        { id: 'c1', name: '민준', photoUri: null, letterId: 'L-con', ended: false, celebrated: false, messages: [], lastReadAt: null },
      ],
      keepsakes: [
        { id: 'k1', kind: 'firstLetter', at: addDays(now, -1).toISOString() },
        { id: 'k2', kind: 'firstConnection', at: now.toISOString() },
      ],
    };
  },
};
