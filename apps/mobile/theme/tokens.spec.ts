import { describe, expect, it } from 'vitest';
import { COLORS } from './tokens';

/** WCAG 2.x 상대 휘도 대비 */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('색 토큰 — 흰 바탕 모노톤 (앱 IA 10.6)', () => {
  it('바탕·상자·선·글자는 무채색이다. 색은 갈피, 갈피의 방, 상대 사진에서 나온다', () => {
    for (const hex of [COLORS.bg, COLORS.fill, COLORS.line, COLORS.ink, COLORS.sub, COLORS.onInk, COLORS.chatBg]) {
      const [r, g, b] = [1, 3, 5].map((i) => hex.slice(i, i + 2));
      expect({ hex, g, b }).toEqual({ hex, g: r, b: r });
    }
  });

  it('글자는 바탕과 회색 상자 위에서 4.5:1 이상', () => {
    for (const text of [COLORS.ink, COLORS.sub, COLORS.danger]) {
      expect(contrast(text, COLORS.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(text, COLORS.fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('먹색 버튼과 내 말풍선 위의 흰 글자도 4.5:1 이상', () => {
    expect(contrast(COLORS.onInk, COLORS.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('코랄 표시(새 말 점, 편지 리본)는 그래픽 기준 3:1 이상', () => {
    expect(contrast(COLORS.mark, COLORS.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(COLORS.mark, COLORS.fill)).toBeGreaterThanOrEqual(3);
  });
});
