import { describe, expect, it } from 'vitest';
import { findForbidden } from './forbidden';

describe('금지 표현', () => {
  it('운명·보장·100% 같은 말을 찾는다 (CLAUDE.md 9.1·16장)', () => {
    expect(findForbidden('운명의 상대예요')).toEqual(['운명']);
    expect(findForbidden('100% 잘 맞아요')).toEqual(['100%']);
    expect(findForbidden('프롤로그가 보장합니다')).toEqual(['보장']);
  });

  it('사람을 상품처럼 다루는 말을 찾는다', () => {
    expect(findForbidden('오늘의 랭킹 보기')).toEqual(['랭킹']);
  });

  it('같은 말이 여러 번 나와도 한 번만 돌려준다', () => {
    expect(findForbidden('운명, 또 운명')).toEqual(['운명']);
  });

  it('평범한 말에는 아무것도 없다', () => {
    expect(findForbidden('오, 좋다. 요즘도 퇴근길에 걸어요?')).toEqual([]);
  });
});
