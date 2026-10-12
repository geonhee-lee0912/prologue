import { describe, expect, it } from 'vitest';
import { isQuietHour, kstDateKey, kstHour } from './time';

describe('한국 시간 — 서버가 UTC 여도 (리뷰 3)', () => {
  it('UTC 12시는 한국 21시 — 조용한 시간이 시작된다', () => {
    const at = new Date('2026-10-11T12:00:00Z');
    expect(kstHour(at)).toBe(21);
    expect(isQuietHour(at)).toBe(true);
  });

  it('UTC 23시 30분은 다음 날 한국 8시 30분 — 조용한 시간이 끝났다', () => {
    const at = new Date('2026-10-11T23:30:00Z');
    expect(kstHour(at)).toBe(8);
    expect(isQuietHour(at)).toBe(false);
    expect(kstDateKey(at)).toBe('2026-10-12');
  });

  it('날짜는 한국 자정에 바뀐다', () => {
    expect(kstDateKey(new Date('2026-10-11T14:59:00Z'))).toBe('2026-10-11');
    expect(kstDateKey(new Date('2026-10-11T15:00:00Z'))).toBe('2026-10-12');
  });

  it('한국 오후 3시는 조용한 시간이 아니다', () => {
    expect(isQuietHour(new Date('2026-10-11T06:00:00Z'))).toBe(false);
  });
});
