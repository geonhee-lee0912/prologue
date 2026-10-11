/**
 * 가벼운 소개 규칙 — 앱 IA 4.1~4.3
 *
 * 사진 중심, 한 장씩. 그날 자정에 만료된다(POLICY.lightIntro.expiresAt).
 * 남은 개수는 세지 않는다 — 지금 보여줄 한 장만 고른다 (하드룰 3).
 */
import type { LightIntro } from './types';

/** 지금 보여줄 가벼운 소개 — 아직 답하지 않았고 기한 전인 첫 장 */
export function currentLightIntro(intros: LightIntro[], now: Date): LightIntro | null {
  return intros.find((i) => i.status === 'new' && new Date(i.expiresAt) > now) ?? null;
}
