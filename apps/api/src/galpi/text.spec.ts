import { describe, expect, it } from 'vitest';
import { truncateCodePoints } from './text';

describe('코드 포인트로 자르기', () => {
  it('한도보다 짧거나 같은 글은 그대로 둔다', () => {
    expect(truncateCodePoints('안녕하세요', 5)).toBe('안녕하세요');
    expect(truncateCodePoints('안녕하세요', 100)).toBe('안녕하세요');
    expect(truncateCodePoints('', 5)).toBe('');
  });

  it('평범한 글은 한도만큼 코드 포인트를 남기고 자른다', () => {
    expect(truncateCodePoints('가나다라마바사', 3)).toBe('가나다');
    expect(truncateCodePoints('abcdef', 4)).toBe('abcd');
  });

  it('한도 자리의 이모지는 반으로 가르지 않는다', () => {
    // 😌 는 UTF-16 으로 두 칸이다. 칸 수로 자르면 앞 절반(외톨이 서로게이트)만 남아 문자열이 깨진다
    const text = `${'a'.repeat(299)}😌끝`;
    const cut = truncateCodePoints(text, 300);
    expect(cut).toBe(`${'a'.repeat(299)}😌`);
    expect(cut).not.toMatch(/\p{Surrogate}/u);
    // 한도 바로 앞에서 끊으면 이모지는 통째로 빠진다 — 절반이 남지 않는다
    expect(truncateCodePoints(text, 299)).toBe('a'.repeat(299));
    expect(truncateCodePoints('😌😌😌', 2)).toBe('😌😌');
  });

  it('한도가 0 이하이면 빈 글', () => {
    expect(truncateCodePoints('안녕', 0)).toBe('');
    expect(truncateCodePoints('안녕', -1)).toBe('');
  });
});
