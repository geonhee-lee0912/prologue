/**
 * 날짜 계산 — 기기 시간대 기준.
 * 테스트는 TZ=Asia/Seoul 로 돈다 (package.json test 스크립트).
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** 달력 날짜 차이 (a - b). 시각은 무시한다. 23:50 과 다음 날 00:10 은 1 */
export function calendarDayDiff(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / DAY_MS);
}

/**
 * "10월 17일 토요일 오전 10시까지". 요일만 쓰면 일주일 뒤 같은 요일이 오늘과 헷갈리고,
 * 편지는 그날이 끝날 때가 아니라 보낸 시각에 닫히므로 시각까지 쓴다 (앱 IA 3.5 "만료일을 사실대로")
 */
export function untilLabel(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const time = `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}시${m > 0 ? ` ${m}분` : ''}`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일 ${time}까지`;
}

/** 그날이 끝나는 순간 (다음 날 0시) */
export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** "2026-10-10" — 하루 단위 키 */
export function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** 방의 밤 — 19시부터 다음 날 6시 전까지. 화면의 틀은 그대로, 방 안만 바뀐다 (IA 3.6) */
export function isNight(date: Date): boolean {
  const h = date.getHours();
  return h >= 19 || h < 6;
}

/** 하루 동안 같은 항목을 고른다 — 갈피의 하루 한마디, 일지 */
export function pickByDay<T>(items: readonly T[], date: Date): T {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  return items[day % items.length];
}
