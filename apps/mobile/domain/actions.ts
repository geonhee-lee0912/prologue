/**
 * 상태 전이 — 저장소(state/app-store.ts)가 감싸는 순수 함수.
 * 바뀌는 게 없으면 받은 state 를 그대로 돌려준다 (저장소가 불필요하게 다시 그리지 않도록).
 */
import { firstMeetingMessages, replyToUser } from './galpi-script';
import { acceptLetter, applyExpiry, chooseCandidate, passLetter } from './letters';
import type { AppState, Connection, GalpiMessage, Keepsake } from './types';

export interface Ctx {
  now: Date;
  newId: () => string;
}

const galpiText = (ctx: Ctx, text: string): GalpiMessage => ({
  id: ctx.newId(),
  kind: 'text',
  from: 'galpi',
  text,
  at: ctx.now.toISOString(),
});

/** 기념품은 종류마다 한 번만 — 여정의 순간에만 생긴다 (IA 3.7) */
function withKeepsake(state: AppState, kind: Keepsake['kind'], ctx: Ctx): Keepsake[] {
  if (state.keepsakes.some((k) => k.kind === kind)) return state.keepsakes;
  return [...state.keepsakes, { id: ctx.newId(), kind, at: ctx.now.toISOString() }];
}

export function beginSession(state: AppState, ctx: Ctx): AppState {
  return {
    ...state,
    previousVisitAt: state.lastVisitAt,
    lastVisitAt: ctx.now.toISOString(),
    letters: applyExpiry(state.letters, ctx.now),
  };
}

export function startFirstRun(state: AppState, ctx: Ctx): AppState {
  if (state.firstRunDone) return state;
  return {
    ...state,
    firstRunDone: true,
    interview: { step: 0, completed: false },
    galpiMessages: [...state.galpiMessages, ...firstMeetingMessages(ctx)],
  };
}

export function sendToGalpi(state: AppState, text: string, ctx: Ctx, opts: { skipped?: boolean } = {}): AppState {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const mine: GalpiMessage = { id: ctx.newId(), kind: 'text', from: 'me', text: trimmed, at: ctx.now.toISOString() };
  const base: AppState = { ...state, galpiMessages: [...state.galpiMessages, mine] };

  // 갈피가 만남 이야기를 물어본 뒤의 답은 만남 이야기로 받는다 (F2)
  if (state.askingMeetingFeedback) {
    const connectionId = state.askingMeetingFeedback;
    return {
      ...base,
      askingMeetingFeedback: null,
      meetings: state.meetings.map((m) => (m.connectionId === connectionId ? { ...m, feedbackGiven: true } : m)),
      keepsakes: withKeepsake(state, 'firstMeeting', ctx),
      galpiMessages: [
        ...base.galpiMessages,
        galpiText(ctx, '들려줘서 고마워요. 이 이야기는 다음 편지를 고를 때 꼭 참고할게요.'),
      ],
    };
  }

  const result = replyToUser(base, { skipped: opts.skipped ?? false }, ctx);
  return {
    ...base,
    interview: result.interview,
    chapters: [...state.chapters, ...result.newChapters],
    galpiMessages: [...base.galpiMessages, ...result.replies],
  };
}

export function askMeetingFeedback(state: AppState, connectionId: string, ctx: Ctx): AppState {
  if (state.askingMeetingFeedback === connectionId) return state;
  return {
    ...state,
    askingMeetingFeedback: connectionId,
    galpiMessages: [
      ...state.galpiMessages,
      galpiText(ctx, '만남은 어땠어요? 좋았던 것도, 아니었던 것도 다 괜찮아요.'),
    ],
  };
}

export function markGalpiRead(state: AppState, ctx: Ctx): AppState {
  return { ...state, galpiLastReadAt: ctx.now.toISOString() };
}

export function chooseLetterCandidate(state: AppState, letterId: string, candidateId: string): AppState {
  return {
    ...state,
    letters: state.letters.map((l) => (l.id === letterId ? chooseCandidate(l, candidateId) : l)),
  };
}

export function answerLetter(
  state: AppState,
  letterId: string,
  answer: 'accept' | 'pass',
  ctx: Ctx,
  reason?: string,
): AppState {
  const letter = state.letters.find((l) => l.id === letterId);
  if (!letter) return state;

  if (answer === 'accept') {
    const accepted = acceptLetter(letter);
    if (accepted === letter) return state;
    return {
      ...state,
      letters: state.letters.map((l) => (l.id === letterId ? accepted : l)),
      keepsakes: withKeepsake(state, 'firstLetter', ctx),
      galpiMessages: [...state.galpiMessages, galpiText(ctx, '좋아요. 상대분도 좋다고 하면 바로 알려 드릴게요 🙂')],
    };
  }

  const passed = passLetter(letter, reason);
  if (passed === letter) return state;
  const thanks = passed.passReason
    ? '말해 줘서 고마워요. 이 말은 서고에만 남아요.'
    : '괜찮아요. 다음 편지를 쓸 때 참고할게요.';
  return {
    ...state,
    letters: state.letters.map((l) => (l.id === letterId ? passed : l)),
    galpiMessages: [
      ...state.galpiMessages,
      { id: ctx.newId(), kind: 'passedLetter', from: 'system', at: ctx.now.toISOString() },
      galpiText(ctx, thanks),
    ],
  };
}

/** mock 전용 — 상대도 수락한 것으로 만든다. 백엔드가 붙으면 서버 이벤트로 바뀐다 */
export function simulateMutualAccept(state: AppState, letterId: string, ctx: Ctx): AppState {
  const letter = state.letters.find((l) => l.id === letterId);
  if (!letter || letter.status !== 'acceptedWaiting' || !letter.chosenCandidateId) return state;
  const p = letter.profiles[letter.chosenCandidateId];
  const connection: Connection = {
    id: ctx.newId(),
    name: p.name,
    photoUri: p.photoUri,
    letterId,
    ended: false,
    celebrated: false,
    messages: [],
    lastReadAt: null,
  };
  return {
    ...state,
    letters: state.letters.map((l) => (l.id === letterId ? { ...l, status: 'connected' as const } : l)),
    connections: [...state.connections, connection],
    keepsakes: withKeepsake(state, 'firstConnection', ctx),
  };
}

export function markCelebrated(state: AppState, connectionId: string): AppState {
  return {
    ...state,
    connections: state.connections.map((c) => (c.id === connectionId ? { ...c, celebrated: true } : c)),
  };
}

export function sendToPerson(state: AppState, connectionId: string, text: string, ctx: Ctx): AppState {
  const trimmed = text.trim();
  if (!trimmed) return state;
  return {
    ...state,
    connections: state.connections.map((c) =>
      c.id === connectionId && !c.ended
        ? { ...c, messages: [...c.messages, { id: ctx.newId(), from: 'me', text: trimmed, at: ctx.now.toISOString() }] }
        : c,
    ),
  };
}

export function markPersonRead(state: AppState, connectionId: string, ctx: Ctx): AppState {
  return {
    ...state,
    connections: state.connections.map((c) =>
      c.id === connectionId ? { ...c, lastReadAt: ctx.now.toISOString() } : c,
    ),
  };
}

export function endConnection(state: AppState, connectionId: string): AppState {
  return {
    ...state,
    connections: state.connections.map((c) => (c.id === connectionId ? { ...c, ended: true } : c)),
  };
}

/** 태엽 — 보상만 있고 벌은 없다 (하드룰 6) */
export function windUp(state: AppState): AppState {
  return { ...state, windCount: state.windCount + 1 };
}

export function pickTasteCard(state: AppState, cardId: string, picked: 0 | 1): AppState {
  return {
    ...state,
    tasteCards: state.tasteCards.map((c) => (c.id === cardId && c.picked === null ? { ...c, picked } : c)),
  };
}

export function answerLightIntro(
  state: AppState,
  id: string,
  answer: 'accept' | 'pass',
  ctx: Ctx,
  reason?: string,
): AppState {
  const intro = state.lightIntros.find((i) => i.id === id && i.status === 'new');
  if (!intro) return state;
  const trimmed = reason?.trim();
  const next =
    answer === 'accept'
      ? { ...intro, status: 'accepted' as const }
      : { ...intro, status: 'passed' as const, ...(trimmed ? { passReason: trimmed } : {}) };
  return {
    ...state,
    lightIntros: state.lightIntros.map((i) => (i.id === id ? next : i)),
    galpiMessages:
      answer === 'accept'
        ? [...state.galpiMessages, galpiText(ctx, '좋아요. 상대분도 좋다고 하면 알려 드릴게요.')]
        : state.galpiMessages,
  };
}

/** 갈피 빼기 — 그 장은 다시 펼치지 않는다 (갈피 문서 3.6 ①) */
export function removeChapter(state: AppState, chapterId: string): AppState {
  return { ...state, chapters: state.chapters.filter((c) => c.id !== chapterId) };
}

export function setSetting(state: AppState, key: keyof AppState['settings'], value: boolean): AppState {
  return { ...state, settings: { ...state.settings, [key]: value } };
}
