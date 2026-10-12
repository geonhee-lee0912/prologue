import { POLICY } from '@prologue/shared';
import { isQuietHour, kstDateKey, kstHour } from '../time';

const HOUR_MS = 60 * 60_000;

export interface ProactiveInput {
  now: Date;
  /** 첫 만남도 그날 갈피가 먼저 건 말로 센다 */
  firstMeetingAt: Date;
  lastUserMessageAt: Date | null;
  lastProactiveAt: Date | null;
  unansweredProactive: number;
  lastSafetyAt: Date | null;
  /** 한국 시간, 시 */
  preferredHour: number;
}

/**
 * 먼저 말 걸지 정한다 (AI 엔진 문서 7장)
 * - 하루 한 번 이하(POLICY.galpi.proactiveMessagesPerDay = 1) — 마지막으로 건 날이 한국 날짜로 오늘이면 걸지 않는다
 * - 밤 9시~아침 8시 금지, 답 없는 말이 두 번이면 멈춤, 주로 대화하던 시각부터
 * - 사용자가 막 말했거나 안전 안내 직후에는 쉰다
 */
export function shouldSendProactive(input: ProactiveInput): boolean {
  const galpi = POLICY.galpi;
  if (isQuietHour(input.now)) return false;
  if (input.unansweredProactive >= galpi.maxUnansweredProactive) return false;
  if (kstHour(input.now) < input.preferredHour) return false;
  const today = kstDateKey(input.now);
  if (kstDateKey(input.firstMeetingAt) === today) return false;
  if (input.lastProactiveAt && kstDateKey(input.lastProactiveAt) === today) return false;
  const since = (at: Date) => input.now.getTime() - at.getTime();
  if (input.lastUserMessageAt && since(input.lastUserMessageAt) < galpi.quietAfterUserMessageHours * HOUR_MS) return false;
  if (input.lastSafetyAt && since(input.lastSafetyAt) < galpi.quietAfterSafetyHours * HOUR_MS) return false;
  return true;
}

/** 그 사람이 주로 대화하던 시각(한국 시간). 조용한 시간에 한 말은 세지 않고, 같으면 이른 시각, 기록이 없으면 기본 시각 */
export function preferredHour(userMessageTimes: Date[]): number {
  const counts = new Map<number, number>();
  for (const at of userMessageTimes) {
    if (isQuietHour(at)) continue;
    const hour = kstHour(at);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  // POLICY 는 as const 라 값 20 이 그대로 타입이 된다 — 시(number)로 넓혀 둔다
  let best: number = POLICY.galpi.defaultProactiveHour;
  let bestCount = 0;
  for (const [hour, count] of counts) {
    if (count > bestCount || (count === bestCount && hour < best)) {
      best = hour;
      bestCount = count;
    }
  }
  return best;
}

/** 먼저 말 걸 때 쓰지 않는 말 — 죄책감 문구(스펙 7장, CLAUDE.md 9.1)와, 잠금화면에 보일 수 있어 "소개팅"(IA 3.11) */
export const PROACTIVE_BANNED: readonly string[] = ['왜 안 와', '왜 안 왔', '기다리고 있', '기다렸', '서운', '어디 갔', '소개팅'];

export function findProactiveBanned(text: string): string[] {
  return PROACTIVE_BANNED.filter((word) => text.includes(word));
}
