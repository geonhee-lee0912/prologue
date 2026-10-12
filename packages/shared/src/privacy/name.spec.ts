import { describe, expect, it } from 'vitest';
import { hasFinalConsonant, renderName } from './name';

describe('받침', () => {
  it('마지막 한글 글자의 받침을 본다', () => {
    expect(hasFinalConsonant('지은')).toBe(true);
    expect(hasFinalConsonant('수지')).toBe(false);
  });

  it('한글이 아니거나 비어 있으면 false', () => {
    expect(hasFinalConsonant('Jay')).toBe(false);
    expect(hasFinalConsonant('')).toBe(false);
  });
});

describe('호칭 치환', () => {
  it('반존대와 편지는 이름 + 님', () => {
    expect(renderName('{name}, 반가워요', '지은', 'mixed')).toBe('지은 님, 반가워요');
    expect(renderName('{name}, 들려준 이야기를 읽었어요.', '지은', 'letter')).toBe('지은 님, 들려준 이야기를 읽었어요.');
  });

  it('말을 놓으면 받침에 따라 아/야', () => {
    expect(renderName('{name}, 오늘 어땠어?', '지은', 'casual')).toBe('지은아, 오늘 어땠어?');
    expect(renderName('{name}, 오늘 어땠어?', '수지', 'casual')).toBe('수지야, 오늘 어땠어?');
  });

  it('여러 번 나와도 모두 바꾼다', () => {
    expect(renderName('{name}, 그래요. {name}다워요', '지은', 'mixed')).toBe('지은 님, 그래요. 지은 님다워요');
  });

  it('이름이 없으면 자리표시자와 뒤의 쉼표를 지운다', () => {
    expect(renderName('{name}, 좋은 아침이에요', null, 'mixed')).toBe('좋은 아침이에요');
    expect(renderName('고마워요, {name}.', '', 'mixed')).toBe('고마워요.');
  });
});
