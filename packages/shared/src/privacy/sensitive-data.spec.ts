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
});
