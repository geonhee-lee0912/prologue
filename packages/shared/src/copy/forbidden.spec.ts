import { describe, expect, it } from 'vitest';
import { FORBIDDEN_ALLOWED_COMPOUNDS, FORBIDDEN_EXPRESSIONS, findForbidden } from './forbidden';

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

describe('일상 복합어 허용 목록', () => {
  it('허용 목록의 낱말은 혼자 있어도 걸리지 않는다', () => {
    for (const compound of FORBIDDEN_ALLOWED_COMPOUNDS) expect(findForbidden(compound)).toEqual([]);
  });

  it('일상 문장 속에서도 걸리지 않는다', () => {
    expect(findForbidden('전세대출 갚느라 바빠요')).toEqual([]);
    expect(findForbidden('완벽주의 성향이 있어요')).toEqual([]);
    expect(findForbidden('보장성 보험 영업을 해요')).toEqual([]);
    expect(findForbidden('연구소장님이세요')).toEqual([]);
  });

  it('같은 문장에 진짜 금지된 쓰임이 있으면 그쪽은 걸린다', () => {
    expect(findForbidden('전세대출 얘기 말고, 사람을 대출하듯')).toEqual(['대출']);
    expect(findForbidden('사회보장 말고, 만남을 보장해요')).toEqual(['보장']);
  });

  it('허용 낱말이 아닌 쓰임은 그대로 걸린다', () => {
    expect(findForbidden('완벽한 매칭')).toEqual(['완벽']);
    expect(findForbidden('대출')).toEqual(['대출']);
  });

  it('지운 자리 양옆의 글자가 이어 붙어 없던 금지 표현이 되지는 않는다', () => {
    expect(findForbidden('소전세대출장')).toEqual([]);
  });

  it('허용 목록이 금지 표현 자체를 가리지 않는다', () => {
    for (const word of FORBIDDEN_EXPRESSIONS) expect(findForbidden(word)).toContain(word);
  });
});
