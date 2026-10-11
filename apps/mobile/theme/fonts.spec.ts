import { describe, expect, it } from 'vitest';
import { FONT, fontFamilyFor } from './fonts';

describe('굵기 → Pretendard 글꼴 파일', () => {
  it('굵기를 정하지 않았거나 보통이면 Regular', () => {
    expect(fontFamilyFor(undefined)).toBe(FONT.regular);
    expect(fontFamilyFor('normal')).toBe(FONT.regular);
    expect(fontFamilyFor('400')).toBe(FONT.regular);
    expect(fontFamilyFor(400)).toBe(FONT.regular);
  });

  it('넣지 않은 가는 굵기는 Regular 로', () => {
    expect(fontFamilyFor('300')).toBe(FONT.regular);
    expect(fontFamilyFor('light')).toBe(FONT.regular);
  });

  it('500 은 Medium, 600 은 SemiBold', () => {
    expect(fontFamilyFor('500')).toBe(FONT.medium);
    expect(fontFamilyFor('medium')).toBe(FONT.medium);
    expect(fontFamilyFor('600')).toBe(FONT.semibold);
    expect(fontFamilyFor(600)).toBe(FONT.semibold);
  });

  it('700 이상과 bold 는 Bold', () => {
    expect(fontFamilyFor('700')).toBe(FONT.bold);
    expect(fontFamilyFor('bold')).toBe(FONT.bold);
    expect(fontFamilyFor('900')).toBe(FONT.bold);
    expect(fontFamilyFor('heavy')).toBe(FONT.bold);
  });
});
