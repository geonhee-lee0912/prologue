import { POLICY } from '@prologue/shared';

/**
 * 한국 시간 — 서버(Railway)는 UTC 일 수 있다. 하루 한 번·조용한 시간은 전부 Asia/Seoul 기준 (AI 엔진 문서 7장)
 */
const KST = 'Asia/Seoul';
const HOUR = new Intl.DateTimeFormat('en-US', { timeZone: KST, hour: 'numeric', hourCycle: 'h23' });
const DATE = new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' });

export function kstHour(date: Date): number {
  return Number(HOUR.format(date));
}

/** 'YYYY-MM-DD' */
export function kstDateKey(date: Date): string {
  return DATE.format(date);
}

/** 21시부터 다음 날 8시 전까지 */
export function isQuietHour(date: Date): boolean {
  const { startHour, endHour } = POLICY.galpi.quietHours;
  const hour = kstHour(date);
  return hour >= startHour || hour < endHour;
}
