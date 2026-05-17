/**
 * 추천 이유 템플릿
 *
 * 사용자에게 노출되는 모든 추천 이유 텍스트는 이 모듈의 템플릿에서만 생성한다.
 * 자유 텍스트 생성 금지 — 금지 표현 검사가 정적으로 가능해야 한다.
 *
 * 참고:
 * - docs/08_추천_알고리즘_기준서_v_0_1.md
 * - docs/prologue_02_copy_tone_guide_v0.1.md (금지 표현 목록)
 *
 * TODO(FR-D): 추천 시스템 구현 시 실제 템플릿을 채운다.
 */

export const RECOMMENDATION_REASON_TEMPLATES = {} as const;

export type RecommendationReasonTemplate = keyof typeof RECOMMENDATION_REASON_TEMPLATES;
