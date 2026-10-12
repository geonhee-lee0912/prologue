import { describe, expect, it } from 'vitest';
import { maskSensitive, SensitiveCategory } from './sensitive-data';

describe('민감정보 마스킹 — 개인정보보호법 23조 전체', () => {
  it('건강 이야기를 가린다', () => {
    const result = maskSensitive('작년에 우울증 치료를 받았어요');
    expect(result.masked).not.toContain('우울증');
    expect(result.masked).toContain('[민감정보:건강]');
    expect(result.categories).toEqual([SensitiveCategory.HEALTH]);
  });

  it('종교(사상·신념)를 가린다', () => {
    const result = maskSensitive('매주 교회에 나가요');
    expect(result.masked).not.toContain('교회');
    expect(result.categories).toEqual([SensitiveCategory.BELIEF]);
  });

  it('정치적 견해와 노조·정당 가입을 가린다', () => {
    expect(maskSensitive('지지하는 정당은 비밀이에요').categories).toEqual([SensitiveCategory.POLITICAL]);
    expect(maskSensitive('회사 노조 활동을 해요').categories).toEqual([SensitiveCategory.UNION_PARTY]);
  });

  it('성생활·범죄경력·인종을 가린다', () => {
    expect(maskSensitive('저는 양성애자예요').categories).toEqual([SensitiveCategory.SEXUAL]);
    expect(maskSensitive('예전에 전과가 있어요').categories).toEqual([SensitiveCategory.CRIMINAL]);
    expect(maskSensitive('저는 혼혈이에요').categories).toEqual([SensitiveCategory.RACE_ETHNICITY]);
  });

  it('여러 범주가 섞이면 모두 가리고 범주를 정해진 순서로 돌려준다', () => {
    const result = maskSensitive('교회 다니고 우울증도 있어요');
    expect(result.masked).toBe('[민감정보:사상·신념] 다니고 [민감정보:건강]도 있어요');
    expect(result.categories).toEqual([SensitiveCategory.BELIEF, SensitiveCategory.HEALTH]);
  });

  it('흔한 말과 겹치는 낱말은 가리지 않는다', () => {
    for (const text of ['게이트 앞에서 만나요', '전과목을 가르쳐요', '미사일 뉴스를 봤어요', '전도유망한 후배예요', '불경기라 힘들어요', '대선배님을 만났어요']) {
      expect(maskSensitive(text)).toEqual({ masked: text, categories: [] });
    }
  });

  it('이미 가린 자리는 다시 가리지 않는다 — 두 번 돌려도 같다', () => {
    const first = maskSensitive('혼혈이고 전과자예요');
    const second = maskSensitive(first.masked);
    expect(second.masked).toBe(first.masked);
    expect(second.categories).toEqual([]);
  });

  it('영문 낱말은 대소문자를 가리지 않는다', () => {
    expect(maskSensitive('adhd 진단을 받았어요').categories).toEqual([SensitiveCategory.HEALTH]);
  });

  it('민감정보가 없으면 그대로 돌려준다', () => {
    const text = '주말에는 등산을 자주 해요';
    expect(maskSensitive(text)).toEqual({ masked: text, categories: [] });
  });

  it('우리가 만든 자리표시자만 그대로 둔다 — 직접 쓴 가짜 자리표시자 안의 민감정보는 가린다', () => {
    const fake = maskSensitive('[민감정보:우울증이 있어요]');
    expect(fake.masked).not.toContain('우울증');
    expect(fake.categories).toEqual([SensitiveCategory.HEALTH]);
    // 진짜 자리표시자는 건드리지 않는다
    expect(maskSensitive('[민감정보:건강]')).toEqual({ masked: '[민감정보:건강]', categories: [] });
    // 가린 결과를 다시 돌려도 같다
    expect(maskSensitive(fake.masked)).toEqual({ masked: fake.masked, categories: [] });
  });

  it('우리가 만드는 아홉 가지 자리표시자는 모두 두 번 돌려도 같다', () => {
    const first = maskSensitive('교회 노조 지지 정당 우울증 성관계 유전병 전과자 홍채 혼혈');
    expect(first.categories).toEqual(Object.values(SensitiveCategory));
    expect(maskSensitive(first.masked)).toEqual({ masked: first.masked, categories: [] });
  });

  it('닫히지 않은 자리표시자가 길게 이어져도 금방 끝난다', () => {
    const startedAt = Date.now();
    maskSensitive('[민감정보:'.repeat(50000));
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });

  it('띄어쓰기 없이 붙여 써도 가린다 — 낱말 안의 공백은 있어도 없어도 같다', () => {
    expect(maskSensitive('요즘 약 복용중이에요')).toEqual({
      masked: '요즘 약 [민감정보:건강]이에요',
      categories: [SensitiveCategory.HEALTH],
    });
    expect(maskSensitive('정치성향이 많이 달라요')).toEqual({
      masked: '[민감정보:정치]이 많이 달라요',
      categories: [SensitiveCategory.POLITICAL],
    });
    expect(maskSensitive('복용중')).toEqual(maskSensitive('복용 중'));
  });

  it('낱말 사이 공백이 여럿이거나 줄이 바뀌어도 한 자리로 가린다', () => {
    expect(maskSensitive('공황   발작이 와요').masked).toBe('[민감정보:건강]이 와요');
    expect(maskSensitive('공황\n발작이 와요').masked).toBe('[민감정보:건강]이 와요');
  });
});
