/**
 * 글꼴 — 전부 Pretendard (2026-10-11 결정). 갈피의 말과 편지도 같다.
 * 파일은 assets/fonts, 불러오기는 app/_layout.tsx.
 */
import type { TextStyle } from 'react-native';

export const FONT = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export type FontFamily = (typeof FONT)[keyof typeof FONT];

const NAMED: Partial<Record<string, number>> = {
  normal: 400,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  condensedBold: 700,
  heavy: 800,
  black: 900,
};

/**
 * React Native 는 직접 넣은 글꼴의 굵기를 바꿔 주지 않는다 — fontWeight 를 글꼴 파일로 바꾼다.
 * 가는 굵기(100~300)는 넣지 않아서 Regular 로 쓴다.
 */
export function fontFamilyFor(weight: TextStyle['fontWeight']): FontFamily {
  const n = weight === undefined ? 400 : (NAMED[String(weight)] ?? (Number(weight) || 400));
  if (n >= 700) return FONT.bold;
  if (n >= 600) return FONT.semibold;
  if (n >= 500) return FONT.medium;
  return FONT.regular;
}
