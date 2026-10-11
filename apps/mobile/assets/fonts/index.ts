/**
 * Pretendard 글꼴 파일 — npm pretendard@1.3.9, SIL OFL 1.1 (Pretendard-LICENSE.txt)
 */
import { FONT, type FontFamily } from '../../theme/fonts';

export const FONT_FILES: Record<FontFamily, number> = {
  [FONT.regular]: require('./Pretendard-Regular.otf'),
  [FONT.medium]: require('./Pretendard-Medium.otf'),
  [FONT.semibold]: require('./Pretendard-SemiBold.otf'),
  [FONT.bold]: require('./Pretendard-Bold.otf'),
};
