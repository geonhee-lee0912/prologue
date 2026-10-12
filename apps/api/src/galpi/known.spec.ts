import { describe, expect, it } from 'vitest';
import { isKnown, type KnownInput, pageGaps } from './known';

const enough = (): KnownInput => ({
  userTurns: 12,
  claimCounts: { now: 2, people: 2, relationship: 3 },
  factValues: { smoking: 'no', marriage_intent: 'yes' },
});

describe('소개할 만큼 알게 됨 (스펙 5.4)', () => {
  it('턴 수 바닥·세 장·실용 정보가 다 차면 알게 됨', () => {
    expect(isKnown(enough())).toBe(true);
  });

  it('턴 수가 바닥(12)에 못 미치면 아니다 — 남성 성의 검증', () => {
    expect(isKnown({ ...enough(), userTurns: 11 })).toBe(false);
  });

  it('빈칸인 장이 있으면 아니다', () => {
    expect(isKnown({ ...enough(), claimCounts: { now: 2, people: 1, relationship: 2 } })).toBe(false);
  });

  it('흡연·결혼 의향을 모르면 아니다', () => {
    expect(isKnown({ ...enough(), factValues: { smoking: 'no' } })).toBe(false);
    expect(isKnown({ ...enough(), factValues: { smoking: 'no', marriage_intent: null } })).toBe(false);
  });

  it('빈칸은 문장이 2개 미만인 장이다 — 만난 뒤 이야기는 보지 않는다', () => {
    expect(pageGaps({ now: 2, people: 1 })).toEqual(['people', 'relationship']);
  });
});
