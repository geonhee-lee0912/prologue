/**
 * 디자인 토큰 — 앱 IA 10.6 디자인 기준(잠정)
 * 모노톤 바탕 + 파스텔 포인트. 팔레트는 화면을 만들며 고른다(설정 탭 개발용 스위처).
 */
export interface Palette {
  label: string;
  a1: string;
  a2: string;
  a3: string;
  /** 연한 바탕 — 내 말풍선, 칩 */
  soft: string;
  /** 주 버튼 */
  primary: string;
}

export const PALETTES = {
  lavender: { label: '라벤더·버터', a1: '#D6CFEA', a2: '#F5E6A8', a3: '#F3C9C4', soft: '#F1EEF8', primary: '#7E6FB0' },
  sky: { label: '하늘·살구', a1: '#C7DDEB', a2: '#F7D1B5', a3: '#E3EBC9', soft: '#EBF3F8', primary: '#5D8FB3' },
  rose: { label: '로즈·올리브', a1: '#EBCFD2', a2: '#D7DDB8', a3: '#F2DEC7', soft: '#F7EEEF', primary: '#A9737C' },
} satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof PALETTES;

export const BASE = {
  bg: '#FBFAF7',
  card: '#FFFFFF',
  ink: '#262420',
  sub: '#8F8A80',
  line: '#ECE9E3',
  /** 새 말 점 — 숫자 대신 */
  dot: '#E79A8F',
  /** 갈피 프로필의 방. 화면의 틀은 그대로, 방 안만 밤이 된다 (IA 3.6) */
  room: {
    wall: '#F1EBDF',
    floor: '#E4DACA',
    wood: '#C2B49E',
    nightWall: '#2E3530',
    nightFloor: '#262C28',
    lamp: '#F3C97A',
  },
};

/** 갈피의 말과 편지만 명조 — 갈피 문서 2.7 */
export const FONT = { letter: 'GowunBatang_400Regular' } as const;

export const RADIUS = { card: 16, bubble: 16, chip: 12 } as const;

export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
