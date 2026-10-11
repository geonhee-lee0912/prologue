import { POLICY } from '@prologue/shared/policy';
import type { AppState, LetterProfile } from './types';

/** 아무 일도 없는 상태 — 테스트와 mock 시나리오의 바탕 */
export function emptyState(): AppState {
  return {
    userName: '지은',
    firstRunDone: true,
    interview: { step: 0, completed: true },
    galpiMessages: [],
    galpiLastReadAt: null,
    letters: [],
    lightIntros: [],
    connections: [],
    meetings: [],
    chapters: [],
    tasteCards: [],
    keepsakes: [],
    windCount: 0,
    lastVisitAt: null,
    previousVisitAt: null,
    considering: null,
    askingMeetingFeedback: null,
    galpiOpeners: { date: '', count: 0 },
    archiveCount: 312,
    me: {
      age: 29,
      area: '성수',
      practical: ['비흡연', '결혼 생각 있음'],
      badges: ['신원 확인', '재직 확인'],
      allowedConditions: ['교사'],
    },
    settings: { lightIntroExposure: POLICY.lightIntro.exposureDefault, pauseLetters: false },
  };
}

export function profile(name: string, overrides: Partial<LetterProfile> = {}): LetterProfile {
  return {
    name,
    photoUri: null,
    age: 31,
    area: '마포',
    practical: ['비흡연'],
    badges: ['재직 확인'],
    allowedConditions: [],
    why: `${name} 님을 소개하고 싶어요.`,
    ...overrides,
  };
}
