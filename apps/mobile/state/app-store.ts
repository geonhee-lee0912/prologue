/**
 * 앱 상태 저장소 — mock 단계. domain/actions.ts 의 순수 함수를 감싼다.
 * 백엔드가 붙으면 서버 상태(react-query)와 나뉜다.
 */
import { create } from 'zustand';
import * as A from '../domain/actions';
import type { AppState } from '../domain/types';
import { SCENARIOS, type ScenarioKey } from '../mock/scenarios';

let seq = 0;
function ctx(): A.Ctx {
  return { now: new Date(), newId: () => `local-${Date.now().toString(36)}-${(seq += 1)}` };
}

export interface AppStore extends AppState {
  scenario: ScenarioKey;
  loadScenario: (key: ScenarioKey) => void;
  beginSession: () => void;
  startFirstRun: () => void;
  sendToGalpi: (text: string, opts?: { skipped?: boolean }) => void;
  openGalpiChat: () => void;
  markGalpiRead: () => void;
  chooseLetterCandidate: (letterId: string, candidateId: string) => void;
  answerLetter: (letterId: string, answer: 'accept' | 'pass', reason?: string) => void;
  simulateMutualAccept: (letterId: string) => void;
  markCelebrated: (connectionId: string) => void;
  sendToPerson: (connectionId: string, text: string) => void;
  markPersonRead: (connectionId: string) => void;
  endConnection: (connectionId: string) => void;
  windUp: () => void;
  pickTasteCard: (cardId: string, picked: 0 | 1) => void;
  answerLightIntro: (id: string, answer: 'accept' | 'pass', reason?: string) => void;
  removeChapter: (chapterId: string) => void;
  setSetting: (key: keyof AppState['settings'], value: boolean) => void;
}

const INITIAL: ScenarioKey = 'firstRun';

export const useAppStore = create<AppStore>()((set) => ({
  ...SCENARIOS[INITIAL](new Date()),
  scenario: INITIAL,
  loadScenario: (key) => set({ ...SCENARIOS[key](new Date()), scenario: key }),
  beginSession: () => set((s) => A.beginSession(s, ctx())),
  startFirstRun: () => set((s) => A.startFirstRun(s, ctx())),
  sendToGalpi: (text, opts) => set((s) => A.sendToGalpi(s, text, ctx(), opts)),
  openGalpiChat: () => set((s) => A.openGalpiChat(s, ctx())),
  markGalpiRead: () => set((s) => A.markGalpiRead(s, ctx())),
  chooseLetterCandidate: (letterId, candidateId) => set((s) => A.chooseLetterCandidate(s, letterId, candidateId)),
  answerLetter: (letterId, answer, reason) => set((s) => A.answerLetter(s, letterId, answer, ctx(), reason)),
  simulateMutualAccept: (letterId) => set((s) => A.simulateMutualAccept(s, letterId, ctx())),
  markCelebrated: (connectionId) => set((s) => A.markCelebrated(s, connectionId)),
  sendToPerson: (connectionId, text) => set((s) => A.sendToPerson(s, connectionId, text, ctx())),
  markPersonRead: (connectionId) => set((s) => A.markPersonRead(s, connectionId, ctx())),
  endConnection: (connectionId) => set((s) => A.endConnection(s, connectionId)),
  windUp: () => set((s) => A.windUp(s)),
  pickTasteCard: (cardId, picked) => set((s) => A.pickTasteCard(s, cardId, picked)),
  answerLightIntro: (id, answer, reason) => set((s) => A.answerLightIntro(s, id, answer, ctx(), reason)),
  removeChapter: (chapterId) => set((s) => A.removeChapter(s, chapterId)),
  setSetting: (key, value) => set((s) => A.setSetting(s, key, value)),
}));
