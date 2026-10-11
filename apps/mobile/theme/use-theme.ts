import { COLORS } from './tokens';

export type Theme = typeof COLORS;

/** 지금은 한 벌. 대화방 배경 바꾸기(테마)가 생기면 여기서 고른다 (BACKLOG 8) */
export function useTheme(): Theme {
  return COLORS;
}
