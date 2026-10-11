import { POLICY } from '@prologue/shared/policy';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarDayDiff,
  endOfLocalDay,
  isNight,
  localDateKey,
  pickByDay,
  untilLabel,
} from './time';

describe('정책 상수', () => {
  it('편지는 7일 동안 열려 있다', () => {
    expect(POLICY.introduction.letterExpiryDays).toBe(7);
  });
});

describe('time', () => {
  it('자정을 넘기면 하루 차이로 센다', () => {
    expect(calendarDayDiff(new Date(2026, 9, 11, 0, 10), new Date(2026, 9, 10, 23, 50))).toBe(1);
  });

  it('같은 날이면 0', () => {
    expect(calendarDayDiff(new Date(2026, 9, 10, 23, 59), new Date(2026, 9, 10, 0, 0))).toBe(0);
  });

  it('기한 표기는 날짜, 요일, 닫히는 시각을 함께 쓴다', () => {
    expect(untilLabel(new Date(2026, 9, 17, 10, 0))).toBe('10월 17일 토요일 오전 10시까지');
  });

  it('일주일 뒤 같은 요일도 날짜로 구분된다', () => {
    const sent = new Date(2026, 9, 10, 10, 0); // 토요일
    expect(untilLabel(addDays(sent, 7))).toBe('10월 17일 토요일 오전 10시까지');
    expect(untilLabel(addDays(sent, 7))).not.toBe(untilLabel(sent));
  });

  it('시각은 오전·오후 12시간제, 분이 있으면 분까지', () => {
    expect(untilLabel(new Date(2026, 9, 17, 15, 30))).toBe('10월 17일 토요일 오후 3시 30분까지');
    expect(untilLabel(new Date(2026, 9, 17, 0, 5))).toBe('10월 17일 토요일 오전 12시 5분까지');
    expect(untilLabel(new Date(2026, 9, 17, 12, 0))).toBe('10월 17일 토요일 오후 12시까지');
  });

  it('그날의 끝은 다음 날 0시', () => {
    expect(endOfLocalDay(new Date(2026, 9, 10, 15, 30)).getTime()).toBe(
      new Date(2026, 9, 11, 0, 0).getTime(),
    );
  });

  it('날짜 키', () => {
    expect(localDateKey(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });

  it('밤은 19시부터 6시 전까지', () => {
    expect(isNight(new Date(2026, 9, 10, 19, 0))).toBe(true);
    expect(isNight(new Date(2026, 9, 10, 5, 59))).toBe(true);
    expect(isNight(new Date(2026, 9, 10, 6, 0))).toBe(false);
    expect(isNight(new Date(2026, 9, 10, 18, 59))).toBe(false);
  });

  it('하루 동안은 같은 것을, 다음 날은 다른 것을 고른다', () => {
    const items = ['a', 'b', 'c'] as const;
    expect(pickByDay(items, new Date(2026, 9, 10, 1, 0))).toBe(
      pickByDay(items, new Date(2026, 9, 10, 23, 0)),
    );
    expect(pickByDay(items, new Date(2026, 9, 10, 9, 0))).not.toBe(
      pickByDay(items, new Date(2026, 9, 11, 9, 0)),
    );
  });
});
