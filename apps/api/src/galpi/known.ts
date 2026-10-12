import { POLICY, type ProfileFactKey, type WikiPageKey } from '@prologue/shared';

/** 알게 됨을 볼 때 채워야 하는 보이는 장 — 만난 뒤 이야기는 2단계라 보지 않는다 */
export const KNOWN_PAGES = ['now', 'people', 'relationship'] as const satisfies readonly WikiPageKey[];

export interface KnownInput {
  userTurns: number;
  claimCounts: Partial<Record<WikiPageKey, number>>;
  factValues: Partial<Record<ProfileFactKey, string | null>>;
}

/** 빈칸인 장 — 프롬프트의 [빈칸] */
export function pageGaps(claimCounts: KnownInput['claimCounts']): WikiPageKey[] {
  return KNOWN_PAGES.filter((page) => (claimCounts[page] ?? 0) < POLICY.galpi.known.minClaimsPerVisiblePage);
}

/** "소개할 만큼 알게 됨" (AI 엔진 문서 5.4) — 턴 수 바닥 + 세 장 + 실용 정보 */
export function isKnown(input: KnownInput): boolean {
  if (input.userTurns < POLICY.interview.minTurns) return false;
  if (pageGaps(input.claimCounts).length > 0) return false;
  return POLICY.galpi.known.requiredPracticalFacts.every((fact) => !!input.factValues[fact]);
}
