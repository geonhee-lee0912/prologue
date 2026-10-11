/**
 * 디자인 토큰 — 흰 바탕 모노톤 (2026-10-11 결정, 앱 IA 10.6)
 * 화면은 먹과 회색으로 조용히 둔다. 색은 갈피, 갈피의 방, 상대 사진에서 나온다.
 * 화면에 쓰는 색은 코랄 표시(mark) 하나뿐이다.
 */
export const COLORS = {
  bg: '#FFFFFF',
  /** 회색 상자, 갈피·상대 말풍선, 칩, 입력줄. 상자 안의 칩·보조 버튼은 흰색 + 선 */
  fill: '#F5F5F5',
  /** 선·테두리, 사진·아바타 자리 */
  line: '#EBEBEB',
  /** 글자, 주 버튼, 내 말풍선 */
  ink: '#191919',
  /** 먹 위의 글자 */
  onInk: '#FFFFFF',
  sub: '#6B6B6B',
  /** 갈피의 코랄 책갈피 — 새 말 점, 편지 리본, 고정 표시에만 */
  mark: '#C8603C',
  /** 되돌릴 수 없는 동작의 글자 */
  danger: '#C8372D',
  /** 대화방 바탕. 배경 바꾸기(테마)는 갈피 대화방 고도화 때 (BACKLOG 8) */
  chatBg: '#FFFFFF',
  /** 갈피 프로필의 방 — 앱에서 유일하게 따뜻한 곳. 화면의 틀은 그대로, 방 안만 밤이 된다 (IA 3.6) */
  room: {
    wall: '#F1EBDF',
    floor: '#E4DACA',
    wood: '#C2B49E',
    nightWall: '#2E3530',
    nightFloor: '#262C28',
    lamp: '#F3C97A',
    /** 책등 — 갈피의 옷 색 (카디건 초록, 책갈피 코랄, 놋쇠, 구두 갈색) */
    spines: ['#5E7358', '#D7744C', '#C9A060', '#8A6A4F'],
  },
} as const;

export const RADIUS = { card: 16, bubble: 16, chip: 12 } as const;

export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
