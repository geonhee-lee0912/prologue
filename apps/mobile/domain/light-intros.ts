/**
 * 가벼운 소개 규칙 — 앱 IA 4.1~4.4
 *
 * 사진 중심, 한 장씩. 그날 자정에 만료된다(POLICY.lightIntro.expiresAt).
 * 남은 개수는 세지 않는다 — 지금 보여줄 한 장만 고른다 (하드룰 3).
 * "가벼운 소개에 나가기"를 켠 사람끼리만 주고받는다 — 받으려면 나도 켜야 한다 (IA 4.4 양쪽 동의).
 */
import type { AppState, LightIntro } from './types';

/** 지금 보여줄 가벼운 소개 — 나가기를 켰을 때만, 아직 답하지 않았고 기한 전인 첫 장 */
export function currentLightIntro(
  state: Pick<AppState, 'lightIntros'> & { settings: Pick<AppState['settings'], 'lightIntroExposure'> },
  now: Date,
): LightIntro | null {
  if (!state.settings.lightIntroExposure) return null;
  return state.lightIntros.find((i) => i.status === 'new' && new Date(i.expiresAt) > now) ?? null;
}
