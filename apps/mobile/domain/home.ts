/**
 * 친구 탭 우선순위 — 앱 IA 3.2 "말로 알리고, 장면은 분위기만"
 *
 * 같은 순위가 중요한 일 카드, 갈피 상태메시지, 갈피 프로필의 말을 정한다.
 * 사건이 일상보다 먼저다. 갈피는 사용자가 안 와서 슬퍼하지 않는다.
 */
import { POLICY } from '@prologue/shared/policy';
import { expiryLabel, isAwaitingMyAnswer } from './letters';
import { calendarDayDiff, pickByDay } from './time';
import type { AppState } from './types';

export type HomeEventKind =
  | 'mutualAccept'
  | 'meetingNextDay'
  | 'letterArrived'
  | 'interviewResume'
  | 'letterConsidering'
  | 'welcomeBack'
  | 'everyday';

export interface HomeCard {
  title: string;
  subtitle?: string;
  actionLabel: string;
  href: string;
}

export interface HomeEvent {
  kind: HomeEventKind;
  /** 갈피 상태메시지이자 갈피 프로필의 말 */
  galpiLine: string;
  /** 친구 탭 중요한 일 카드. 5~7순위는 카드 없이 말로만 */
  card: HomeCard | null;
  /** meetingNextDay 일 때, 갈피가 만남 이야기를 물을 연결 */
  meetingConnectionId?: string;
}

export interface HomeSelection {
  primary: HomeEvent;
  /** 카드가 있는 다음 순위 하나 (작게) */
  secondary: HomeEvent | null;
}

const EVERYDAY_LINES = [
  '오늘은 서고 창가에 햇빛이 길게 들어와요 ☀️',
  '어제 들려준 이야기, 한 번 더 읽어 봤어요 🌿',
  '오늘은 오래된 편지들을 정리하고 있어요 ✉️',
  '비 오는 날엔 서고가 더 조용해져요 ☔',
  '책장에 먼지를 털었어요 📚',
  '따뜻한 차를 한 잔 내렸어요 ☕',
  '창밖을 보다가 지난 이야기가 떠올랐어요 🙂',
] as const;

export function everydayLine(now: Date): string {
  return pickByDay(EVERYDAY_LINES, now);
}

export function collectHomeEvents(state: AppState, now: Date): HomeEvent[] {
  const events: HomeEvent[] = [];
  const name = state.userName;

  // 1. 서로 수락 — 한 번만
  const fresh = state.connections.find((c) => !c.ended && !c.celebrated);
  if (fresh) {
    events.push({
      kind: 'mutualAccept',
      galpiLine: '두 분 다 이야기 나눠 보고 싶대요.',
      card: {
        title: `${fresh.name} 님과 연결됐어요`,
        subtitle: '두 분 다 이야기 나눠 보고 싶대요',
        actionLabel: '대화하기',
        href: `/chat/${fresh.id}`,
      },
    });
  }

  // 2. 만남 다음 날 (이틀 뒤까지)
  const pendingMeeting = state.meetings.find((m) => {
    if (m.feedbackGiven) return false;
    const diff = calendarDayDiff(now, new Date(m.date));
    return diff >= 1 && diff <= 2;
  });
  if (pendingMeeting) {
    const yesterday = calendarDayDiff(now, new Date(pendingMeeting.date)) === 1;
    events.push({
      kind: 'meetingNextDay',
      galpiLine: yesterday ? '어제는 어땠어요?' : '지난번 만남은 어땠어요?',
      card: {
        title: yesterday ? '어제 만남은 어땠어요?' : '지난 만남은 어땠어요?',
        subtitle: '좋았던 것도, 아니었던 것도 다 괜찮아요',
        actionLabel: '들려주기',
        href: '/galpi/chat',
      },
      meetingConnectionId: pendingMeeting.connectionId,
    });
  }

  // 3. 편지 도착, 아직 답 안 함
  const letter = state.letters.find((l) => isAwaitingMyAnswer(l, now));
  if (letter) {
    events.push({
      kind: 'letterArrived',
      galpiLine: `${name} 님, 편지를 썼어요 ✉️`,
      card: {
        title: '✉️ 갈피가 편지를 썼어요',
        subtitle: expiryLabel(letter),
        actionLabel: '읽기',
        href: `/letter/${letter.id}`,
      },
    });
  }

  // 4. 인터뷰 이어하기
  if (!state.interview.completed) {
    const started = state.interview.step > 0;
    events.push({
      kind: 'interviewResume',
      galpiLine: started ? '지난번엔 여기까지 이야기했어요.' : '천천히 시작해도 괜찮아요. 요즘 어떻게 지내요?',
      card: {
        title: started ? '이야기를 이어서 할까요?' : '갈피와 이야기를 시작해 볼까요?',
        subtitle: started ? '지난번엔 여기까지 이야기했어요' : undefined,
        actionLabel: started ? '이어서 하기' : '시작하기',
        href: '/galpi/chat',
      },
    });
  }

  // 5. 편지 고민 중 — 카드 없이 말로만
  if (state.considering) {
    events.push({
      kind: 'letterConsidering',
      galpiLine: `편지를 쓸지 고민 중인 분이 있어요. ${state.considering.hint}`,
      card: null,
    });
  }

  // 6. 오랜만에 옴 — 반가워할 뿐, 탓하지 않는다
  if (
    state.previousVisitAt &&
    calendarDayDiff(now, new Date(state.previousVisitAt)) >= POLICY.galpi.welcomeBackAfterDays
  ) {
    events.push({ kind: 'welcomeBack', galpiLine: `${name} 님! 반가워요 ☕`, card: null });
  }

  // 7. 평소
  events.push({ kind: 'everyday', galpiLine: everydayLine(now), card: null });
  return events;
}

export function selectHome(state: AppState, now: Date): HomeSelection {
  const events = collectHomeEvents(state, now);
  const primary = events[0];
  const secondary = events.slice(1).find((e) => e.card !== null) ?? null;
  return { primary, secondary };
}
