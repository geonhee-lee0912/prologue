/**
 * 갈피 이미지 — 시안(2026-10-09) 기준. 최종 에셋은 고해상도로 다시 만든다.
 */
import type { Expression } from '../../domain/types';

export const GALPI_AVATAR: number = require('./avatar.png');
export const GALPI_FRONT: number = require('./front.png');

export const GALPI_EXPRESSIONS: Record<Expression, number> = {
  welcome: require('./expr-welcome.png'),
  wave: require('./expr-wave.png'),
  curious: require('./expr-curious.png'),
  thinking: require('./expr-thinking.png'),
  worried: require('./expr-worried.png'),
  comfort: require('./expr-comfort.png'),
  shy: require('./expr-shy.png'),
  proud: require('./expr-proud.png'),
  sleepy: require('./expr-sleepy.png'),
};
