import { POLICY } from '@prologue/shared';

export interface CompletionInput {
  region1?: string | null;
  targetGender?: string | null;
  jobCategory?: string | null;
  intro?: string | null;
  lifestyleTags?: string[];
  answerCounts: { story: number; relationship: number };
  hasPreference: boolean;
}

/**
 * 프로필 완성도 계산 (0~100).
 *
 * 가중치 (FR-C07 운영 중 조정 가능 기준 — packages/shared/policy 에 옮길 수 있음):
 * - 지역 (region1, '미설정' 제외)            : 10
 * - 매칭 대상 성별 (targetGender)             :  5
 * - 직업군 (jobCategory)                      : 10
 * - 자기소개 (intro, 최소 길이 충족)          : 20
 * - 라이프스타일 태그 (3개 이상)              : 15
 * - story 문답 (2개 이상)                     : 15
 * - relationship 문답 (2개 이상)              : 15
 * - 관계 선호 (RelationshipPreference 있음)   : 10
 */
export function calculateCompletion(input: CompletionInput): number {
  let score = 0;

  if (input.region1 && input.region1 !== '미설정') score += 10;
  if (input.targetGender) score += 5;
  if (input.jobCategory) score += 10;
  if (input.intro && input.intro.length >= POLICY.profile.minIntroLength) score += 20;
  if (input.lifestyleTags && input.lifestyleTags.length >= 3) score += 15;
  if (input.answerCounts.story >= 2) score += 15;
  if (input.answerCounts.relationship >= 2) score += 15;
  if (input.hasPreference) score += 10;

  return Math.min(100, score);
}
